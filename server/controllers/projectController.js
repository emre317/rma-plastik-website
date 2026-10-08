import mongoose from 'mongoose';

import Project from '../models/Project.js';
import { CONTENT_LANGUAGES } from '../config/languages.js';
import { markContentChanged } from '../models/SiteSettings.js';

const FIELDS = { client: 160, title: 200 };
const IMAGE_PATTERN = /^\/(uploads\/projects|images\/custom-molding)\/[A-Za-z0-9._-]+$/;

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const validId = (id) => mongoose.isValidObjectId(id);

function handleError(res, error, label) {
  if (error instanceof mongoose.Error.ValidationError) {
    return fail(res, 400, Object.values(error.errors)[0]?.message || 'Lütfen alanları kontrol edin.');
  }

  console.error(`${label}:`, error);
  return fail(res, 500, 'İşlem tamamlanamadı.');
}

const texts = (source) =>
  Object.fromEntries(
    CONTENT_LANGUAGES.map((lang) => [
      lang,
      Object.fromEntries(Object.entries(FIELDS).map(([field, max]) => [field, str(source?.[lang]?.[field], max)])),
    ])
  );

function payload(body = {}) {
  const image = str(body.image, 300);

  return {
    image: IMAGE_PATTERN.test(image) ? image : '',
    published: body.published === undefined ? true : Boolean(body.published),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    i18n: texts(body.i18n),
  };
}

/* Public snapshot part */
export async function publicProjects() {
  const projects = await Project.find({ published: true }).sort({ order: 1, createdAt: 1 });

  return projects.map((project) => ({ image: project.image || '', i18n: texts(project.i18n) }));
}

export async function listProjects(req, res) {
  try {
    const projects = await Project.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, data: projects });
  } catch (error) {
    return handleError(res, error, 'List projects error');
  }
}

export async function createProject(req, res) {
  try {
    const data = payload(req.body);
    if (!data.i18n.tr.title) return fail(res, 400, 'Türkçe proje başlığı zorunludur.');

    const project = await Project.create(data);
    await markContentChanged();
    return res.status(201).json({ success: true, data: project });
  } catch (error) {
    return handleError(res, error, 'Create project error');
  }
}

export async function updateProject(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Proje bulunamadı.');
    const data = payload(req.body);
    if (!data.i18n.tr.title) return fail(res, 400, 'Türkçe proje başlığı zorunludur.');

    const project = await Project.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true });
    if (!project) return fail(res, 404, 'Proje bulunamadı.');

    await markContentChanged();
    return res.json({ success: true, data: project });
  } catch (error) {
    return handleError(res, error, 'Update project error');
  }
}

export async function deleteProject(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Proje bulunamadı.');
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return fail(res, 404, 'Proje bulunamadı.');

    await markContentChanged();
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Delete project error');
  }
}

/* Brochure projects into the database (only when there are none yet) */
export async function importDefaultProjects(req, res) {
  try {
    if (await Project.countDocuments()) return fail(res, 409, 'Projeler zaten panelde.');

    const { default: builtIn } = await import('../../client/src/data/projects.builtin.js');
    const docs = await Project.insertMany(builtIn.map((project, index) => ({ ...payload(project), order: (index + 1) * 10 })));

    await markContentChanged();
    return res.status(201).json({ success: true, data: docs });
  } catch (error) {
    return handleError(res, error, 'Import projects error');
  }
}
