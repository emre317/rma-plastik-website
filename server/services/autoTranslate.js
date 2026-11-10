import mongoose from 'mongoose';

import SiteText from '../models/SiteText.js';
import TranslationJob from '../models/TranslationJob.js';
import { markContentChanged } from '../models/SiteSettings.js';
import { TARGET_LANGUAGES, isTranslationEnabled, translateItems, translationErrorText } from './translator.js';
import trLocale from '../../client/src/i18n/locales/tr.js';
import enLocale from '../../client/src/i18n/locales/en.js';
import arLocale from '../../client/src/i18n/locales/ar.js';

/*
  Automatic English / Arabic for content saved in the panel.

  Before the save, every `i18n` block in the request ({ tr: {...}, en: {...},
  ar: {...} }, also inside lists such as a sector's products) is compared with
  the stored document. A field is translated when its Turkish text is filled and
    - the English / Arabic field is empty, or
    - the Turkish text changed while the English / Arabic field was left as it was.
  A translation typed in the panel is never overwritten.

  The save is answered at once (with { translation: { jobId, fields } }); the
  translation runs in the background and writes each field only if neither
  the Turkish source nor the target changed in the meantime. The panel then
  shows the result (GET /api/admin/translations/:id) and "Yayınla" publishes it.
*/

const LOCALES = { tr: trLocale, en: enLocale, ar: arLocale };
const MAX_FIELDS = 400;

const norm = (value) => (typeof value === 'string' ? value.trim() : '');
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export const getPath = (object, segments) => segments.reduce((value, key) => (value == null ? undefined : value[key]), object);

function needsTranslation(source, current, previous, lang, field) {
  if (!norm(source)) return false;
  if (!norm(current)) return true;
  if (!previous) return false;
  const turkishChanged = norm(previous.tr?.[field]) !== norm(source);
  const targetUntouched = norm(current) === norm(previous[lang]?.[field]);
  return turkishChanged && targetUntouched;
}

/* Every i18n block of a request body: [{ path: ['products', 2, 'i18n'], block }] */
export function findBlocks(value, path = [], found = [], depth = 0) {
  if (depth > 6 || found.length > 200) return found;

  if (Array.isArray(value)) {
    value.forEach((item, index) => findBlocks(item, [...path, index], found, depth + 1));
  } else if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'i18n' && isObject(child) && isObject(child.tr)) found.push({ path: [...path, key], block: child });
      else if (isObject(child) || Array.isArray(child)) findBlocks(child, [...path, key], found, depth + 1);
    }
  }

  return found;
}

/* The fields to translate: [{ path, field, langs }] */
export function planTranslation(body, previousDoc) {
  const plan = [];

  for (const { path, block } of findBlocks(body)) {
    const previous = previousDoc ? getPath(previousDoc, path) : null;

    for (const [field, source] of Object.entries(block.tr)) {
      if (typeof source !== 'string') continue;
      const langs = TARGET_LANGUAGES.filter((lang) => needsTranslation(source, block[lang]?.[field], previous, lang, field));
      if (langs.length) plan.push({ path, field, langs });
      if (plan.length >= MAX_FIELDS) return plan;
    }
  }

  return plan;
}

/* maxlength of a schema path such as ['products', 2, 'i18n', 'en', 'name'] */
export function maxLengthOf(schema, segments) {
  const parts = segments.filter((part) => typeof part === 'string');
  let current = schema;

  for (let i = 0; i < parts.length && current; i += 1) {
    const rest = parts.slice(i).join('.');
    const direct = current.path(rest);
    if (direct) return direct.options?.maxlength ?? null;

    // Step into a list or nested schema at the longest prefix that is one
    let stepped = false;
    for (let j = parts.length - 1; j > i; j -= 1) {
      const prefix = current.path(parts.slice(i, j).join('.'));
      if (prefix?.schema) {
        current = prefix.schema;
        i = j - 1;
        stepped = true;
        break;
      }
    }
    if (!stepped) return null;
  }

  return null;
}

const cut = (text, max) => (max && text.length > max ? text.slice(0, max).trim() : text);
const dotted = (segments) => segments.join('.');

function missingOr(path, value) {
  return value ? { [path]: value } : { $or: [{ [path]: '' }, { [path]: null }, { [path]: { $exists: false } }] };
}

async function finishJob(jobId, update) {
  try {
    await TranslationJob.updateOne({ _id: jobId }, { $set: { ...update, finishedAt: new Date() } });
  } catch (error) {
    console.error('[translate] job status:', error.message);
  }
}

/* Background part for a document model (posts, products, sectors…) */
export async function runDocumentTranslation(Model, id, plan, jobId, translate = translateItems) {
  try {
    const doc = await Model.findById(id).lean();
    if (!doc) return finishJob(jobId, { status: 'failed', error: 'Kayıt bulunamadı.' });

    const work = [];
    plan.forEach((item, index) => {
      const source = getPath(doc, [...item.path, 'tr', item.field]);
      if (!norm(source)) return;
      work.push({
        id: String(index),
        text: source,
        source,
        maxLength: maxLengthOf(Model.schema, [...item.path, 'en', item.field]),
        targets: item.langs.map((lang) => ({ lang, stored: getPath(doc, [...item.path, lang, item.field]) || '' })),
        item,
      });
    });

    const answers = await translate(work);
    let written = 0;

    for (const entry of work) {
      const answer = answers.get(entry.id);
      if (!answer) continue;
      for (const { lang, stored } of entry.targets) {
        const value = norm(answer[lang]);
        if (!value) continue;
        const targetPath = dotted([...entry.item.path, lang, entry.item.field]);
        const result = await Model.updateOne(
          { _id: id, [dotted([...entry.item.path, 'tr', entry.item.field])]: entry.source, ...missingOr(targetPath, stored) },
          { $set: { [targetPath]: cut(value, entry.maxLength) } }
        );
        if (result.modifiedCount || result.matchedCount) written += 1;
      }
    }

    if (written) await markContentChanged();
    return finishJob(jobId, { status: 'done', translated: written });
  } catch (error) {
    console.error('[translate]', error.message);
    return finishJob(jobId, { status: 'failed', error: translationErrorText(error) });
  }
}

/* Records the run, then starts it in the background (the id goes into the answer at once) */
function startJob(jobId, kind, refId, fields, run) {
  TranslationJob.create({ _id: jobId, kind, refId: String(refId).slice(0, 200), fields })
    .catch((error) => console.error('[translate] job create:', error.message))
    .finally(() => setImmediate(run));
}

/*
  Route middleware for the panel's create / update of a model with i18n blocks:
    router.put('/posts/:id', content, autoTranslate(Post, 'post'), updatePost)
*/
export function autoTranslate(Model, kind) {
  return async (req, res, next) => {
    if (!isTranslationEnabled() || !isObject(req.body)) return next();

    let plan = [];
    try {
      const previous = req.params.id ? await Model.findById(req.params.id).lean() : null;
      plan = planTranslation(req.body, previous);
    } catch (error) {
      console.error('[translate] plan:', error.message);
    }
    if (!plan.length) return next();

    const json = res.json.bind(res);
    res.json = (body) => {
      const id = req.params.id || body?.data?._id;
      if (res.statusCode >= 400 || !body?.success || !id) return json(body);

      // Answer first; translate after
      const jobId = new mongoose.Types.ObjectId();
      startJob(jobId, kind, id, plan.length, () => runDocumentTranslation(Model, id, plan, jobId));
      return json({ ...body, translation: { jobId, fields: plan.length, pending: true } });
    };

    return next();
  };
}

/* ---------- Sayfa Metinleri (SiteText: { key, tr, en, ar }) ---------- */

const localeText = (lang, key) => {
  const value = getPath(LOCALES[lang], key.split('.'));
  return typeof value === 'string' ? value : '';
};

export function planTextTranslation(items, overrides) {
  const plan = [];

  for (const item of items) {
    if (typeof item?.key !== 'string' || typeof item.tr !== 'string') continue;
    const saved = overrides.get(item.key);
    // What the site showed before: the saved override, else the built-in text.
    // The built-in text also counts as "untouched" (the editor may send it back).
    const shown = Object.fromEntries(['tr', ...TARGET_LANGUAGES].map((lang) => [lang, { text: norm(saved?.[lang]) || localeText(lang, item.key) }]));
    const builtIn = Object.fromEntries(['tr', ...TARGET_LANGUAGES].map((lang) => [lang, { text: localeText(lang, item.key) }]));
    builtIn.tr = shown.tr;
    const langs = TARGET_LANGUAGES.filter((lang) =>
      needsTranslation(item.tr, item[lang], shown, lang, 'text') || needsTranslation(item.tr, item[lang], builtIn, lang, 'text'));
    if (langs.length) plan.push({ key: item.key, langs });
    if (plan.length >= MAX_FIELDS) break;
  }

  return plan;
}

export async function runTextTranslation(plan, jobId, translate = translateItems) {
  try {
    const docs = await SiteText.find({ key: { $in: plan.map((item) => item.key) } }).lean();
    const byKey = new Map(docs.map((doc) => [doc.key, doc]));

    const work = plan
      .map((item, index) => ({ item, doc: byKey.get(item.key), id: String(index) }))
      .filter(({ doc }) => doc && norm(doc.tr))
      .map(({ item, doc, id }) => ({ id, text: doc.tr, item, doc }));

    const answers = await translate(work);
    let written = 0;

    for (const { id, item, doc } of work) {
      const answer = answers.get(id);
      if (!answer) continue;
      for (const lang of item.langs) {
        const value = norm(answer[lang]);
        if (!value) continue;
        await SiteText.updateOne(
          { key: item.key, tr: doc.tr, ...missingOr(lang, doc[lang]) },
          { $set: { [lang]: cut(value, 5000) } }
        );
        written += 1;
      }
    }

    if (written) await markContentChanged();
    return finishJob(jobId, { status: 'done', translated: written });
  } catch (error) {
    console.error('[translate] texts:', error.message);
    return finishJob(jobId, { status: 'failed', error: translationErrorText(error) });
  }
}

export function autoTranslateTexts() {
  return async (req, res, next) => {
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 500) : [];
    if (!isTranslationEnabled() || !items.length) return next();

    let plan = [];
    try {
      const keys = items.map((item) => item?.key).filter((key) => typeof key === 'string');
      const saved = await SiteText.find({ key: { $in: keys } }).lean();
      plan = planTextTranslation(items, new Map(saved.map((doc) => [doc.key, doc])));
    } catch (error) {
      console.error('[translate] texts plan:', error.message);
    }
    if (!plan.length) return next();

    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 400 || !body?.success) return json(body);
      const jobId = new mongoose.Types.ObjectId();
      startJob(jobId, 'texts', plan.map((item) => item.key).join(','), plan.length, () => runTextTranslation(plan, jobId));
      return json({ ...body, translation: { jobId, fields: plan.length, pending: true } });
    };

    return next();
  };
}
