import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

const { default: Post } = await import('../models/Post.js');
const posts = memoryModel(Post);
const { default: Sector } = await import('../models/Sector.js');
memoryModel(Sector);
const { default: SiteText } = await import('../models/SiteText.js');
const texts = memoryModel(SiteText);
const { default: TranslationJob } = await import('../models/TranslationJob.js');
const jobs = memoryModel(TranslationJob);
const { default: SiteSettings } = await import('../models/SiteSettings.js');
memoryModel(SiteSettings);

const {
  findBlocks, maxLengthOf, planTranslation, planTextTranslation, runDocumentTranslation, runTextTranslation,
} = await import('../services/autoTranslate.js');
const { isTranslationEnabled } = await import('../services/translator.js');

// Stand-in for Claude: "[en] text" / "[ar] text"
const fakeTranslate = async (items) => new Map(items.map((item) => [item.id, { en: `[en] ${item.text}`, ar: `[ar] ${item.text}` }]));

test('only with an API key, and AUTO_TRANSLATE=false turns it off', () => {
  delete process.env.ANTHROPIC_API_KEY;
  assert.equal(isTranslationEnabled(), false);
  process.env.ANTHROPIC_API_KEY = 'test';
  assert.equal(isTranslationEnabled(), true);
  process.env.AUTO_TRANSLATE = 'false';
  assert.equal(isTranslationEnabled(), false);
  delete process.env.AUTO_TRANSLATE;
  delete process.env.ANTHROPIC_API_KEY;
});

test('i18n blocks are found at the top and inside lists', () => {
  const body = { slug: 'x', i18n: { tr: { title: 'A' } }, products: [{ i18n: { tr: { name: 'B' } } }, { group: 'g' }] };
  assert.deepEqual(findBlocks(body).map((item) => item.path), [['i18n'], ['products', 0, 'i18n']]);
});

test('new content: empty English / Arabic fields are translated; typed ones are kept', () => {
  const plan = planTranslation({ i18n: { tr: { title: 'Su deposu', excerpt: 'Kısa', body: '' }, en: { title: '', excerpt: 'Short (typed)' }, ar: {} } }, null);
  assert.deepEqual(plan, [
    { path: ['i18n'], field: 'title', langs: ['en', 'ar'] },
    { path: ['i18n'], field: 'excerpt', langs: ['ar'] },
  ]);
});

test('an edit: changed Turkish updates untouched translations, never edited ones', () => {
  const previous = { i18n: { tr: { title: 'Eski', excerpt: 'Aynı' }, en: { title: 'Old', excerpt: 'Same' }, ar: { title: 'قديم', excerpt: 'نفس' } } };
  const body = { i18n: { tr: { title: 'Yeni', excerpt: 'Aynı' }, en: { title: 'Old', excerpt: 'Same' }, ar: { title: 'جديد (elle)', excerpt: 'نفس' } } };
  assert.deepEqual(planTranslation(body, previous), [{ path: ['i18n'], field: 'title', langs: ['en'] }]);
});

test('field limits come from the schema, also inside lists', () => {
  assert.equal(maxLengthOf(Post.schema, ['i18n', 'en', 'seoTitle']), 70);
  assert.equal(maxLengthOf(Sector.schema, ['products', 3, 'i18n', 'ar', 'name']), 120);
  assert.equal(maxLengthOf(Post.schema, ['i18n', 'en', 'nope']), null);
});

test('the background run writes the translations, cut to the field limit', async () => {
  posts.reset();
  const post = await Post.create({ slug: 'deneme', i18n: { tr: { title: 'Kimyasal tank', seoTitle: 'Ş'.repeat(70) }, en: {}, ar: {} } });
  const job = await TranslationJob.create({ kind: 'post', refId: String(post._id), fields: 2 });
  const plan = planTranslation({ i18n: { tr: { title: 'Kimyasal tank', seoTitle: 'Ş'.repeat(70) }, en: {}, ar: {} } }, null);

  await runDocumentTranslation(Post, post._id, plan, job._id, fakeTranslate);

  assert.equal(post.i18n.en.title, '[en] Kimyasal tank');
  assert.equal(post.i18n.ar.title, '[ar] Kimyasal tank');
  assert.equal(post.i18n.en.seoTitle.length, 70);
  const done = jobs.store.find((item) => String(item._id) === String(job._id));
  assert.equal(done.status, 'done');
  assert.equal(done.translated, 4);
});

test('a translation typed while the run was going is not overwritten', async () => {
  posts.reset();
  const post = await Post.create({ slug: 'yarisma', i18n: { tr: { title: 'Depo' }, en: {}, ar: {} } });
  const plan = planTranslation({ i18n: { tr: { title: 'Depo' }, en: {}, ar: {} } }, null);
  const slow = async (items) => {
    post.set({ 'i18n.en.title': 'Tank (typed)' });
    return fakeTranslate(items);
  };
  await runDocumentTranslation(Post, post._id, plan, null, slow);
  assert.equal(post.i18n.en.title, 'Tank (typed)');
  assert.equal(post.i18n.ar.title, '[ar] Depo');
});

test('a failed translation leaves the content as saved and records the error', async () => {
  posts.reset();
  const post = await Post.create({ slug: 'hata', i18n: { tr: { title: 'Depo' }, en: {}, ar: {} } });
  const job = await TranslationJob.create({ kind: 'post', refId: String(post._id), fields: 1 });
  await runDocumentTranslation(Post, post._id, [{ path: ['i18n'], field: 'title', langs: ['en'] }], job._id, async () => { throw new Error('boom'); });
  assert.equal(post.i18n.en.title, '');
  const failed = jobs.store.find((item) => String(item._id) === String(job._id));
  assert.equal(failed.status, 'failed');
  assert.equal(failed.error, 'boom');
});

test('page texts: an edited Turkish text replaces the built-in English and Arabic', async () => {
  texts.reset();
  // The panel sends the built-in English / Arabic back unchanged
  const items = [
    { key: 'hero.kicker', tr: 'Rotasyonel Kalıplama Uzmanı', en: 'Rotational Moulding', ar: '' },
    { key: 'hero.lead', tr: 'Aynı', en: 'Typed English', ar: 'نص' },
  ];
  const plan = planTextTranslation(items, new Map());
  assert.equal(plan[0].key, 'hero.kicker');
  assert.deepEqual(plan[0].langs, ['en', 'ar']);
  assert.ok(!plan.some((item) => item.key === 'hero.lead' && item.langs.includes('en')));

  await SiteText.create({ key: 'hero.kicker', tr: 'Rotasyonel Kalıplama Uzmanı', en: 'Rotational Moulding', ar: '' });
  await runTextTranslation(plan.filter((item) => item.key === 'hero.kicker'), null, fakeTranslate);
  const saved = texts.store.find((doc) => doc.key === 'hero.kicker');
  assert.equal(saved.en, '[en] Rotasyonel Kalıplama Uzmanı');
  assert.equal(saved.ar, '[ar] Rotasyonel Kalıplama Uzmanı');
});

test('page texts: the built-in English sent back again still counts as untouched', () => {
  const overrides = new Map([['hero.kicker', { key: 'hero.kicker', tr: 'Birinci', en: '[en] Birinci', ar: '[ar] Birinci' }]]);
  const plan = planTextTranslation([{ key: 'hero.kicker', tr: 'İkinci', en: 'Rotational Moulding', ar: '[ar] Birinci' }], overrides);
  assert.deepEqual(plan, [{ key: 'hero.kicker', langs: ['en', 'ar'] }]);
});
