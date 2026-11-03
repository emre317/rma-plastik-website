import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import multer from 'multer';

import { UPLOAD_ROOT } from './upload.js';
import {
  PROJECT_FILE_TYPES,
  PROJECT_MAX_FILES,
  PROJECT_MAX_FILE_MB,
} from '../../client/src/data/projectBrief.js';

const serverRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEFAULT_ROOT = path.join(serverRoot, 'private', 'quote-files');

const inside = (child, parent) => {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

/*
  Drawings and photos sent with a custom project brief are customer documents:
  they are kept OUTSIDE the public /uploads folder (QUOTE_FILES_DIR) and are
  only handed out to logged-in sales users, as downloads.
*/
function resolveRoot() {
  const configured = process.env.QUOTE_FILES_DIR ? path.resolve(process.env.QUOTE_FILES_DIR) : DEFAULT_ROOT;

  if (inside(configured, UPLOAD_ROOT) || /(^|[\\/])public_html([\\/]|$)/.test(configured)) {
    console.warn('QUOTE_FILES_DIR must not be inside a public folder; using server/private/quote-files instead.');
    return DEFAULT_ROOT;
  }

  return configured;
}

export const QUOTE_FILES_ROOT = resolveRoot();

fs.mkdirSync(QUOTE_FILES_ROOT, { recursive: true });

const MAX_BYTES = PROJECT_MAX_FILE_MB * 1024 * 1024;

const extensionOf = (name) => path.extname(String(name || '')).slice(1).toLowerCase();

const ascii = (bytes, start = 0, end = bytes.length) => bytes.subarray(start, end).toString('latin1');
const textStart = (bytes) => ascii(bytes).replace(/^﻿|^\xEF\xBB\xBF/, '').trimStart();

/*
  The extension is not trusted: the first bytes must match it too.
  Text formats (STEP, IGES, DXF, ASCII STL) are recognised by their header.
*/
const SIGNATURES = {
  pdf: (b) => ascii(b, 0, 5) === '%PDF-',
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  webp: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
  step: (b) => textStart(b).startsWith('ISO-10303-21'),
  iges: (b) => b.length >= 73 && ascii(b, 72, 73) === 'S',
  dxf: (b) => /^0\s*\r?\n\s*SECTION/.test(textStart(b)) || ascii(b, 0, 18) === 'AutoCAD Binary DXF',
  dwg: (b) => /^AC10\d\d/.test(ascii(b, 0, 6)),
  zip: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
  // ASCII ("solid …") or binary: 80-byte header, triangle count, 50 bytes per triangle
  stl: (b, size) => textStart(b).startsWith('solid') || (b.length >= 84 && size === 84 + 50 * b.readUInt32LE(80)),
};
SIGNATURES.jpeg = SIGNATURES.jpg;
SIGNATURES.stp = SIGNATURES.step;
SIGNATURES.igs = SIGNATURES.iges;

export function matchesProjectFile(extension, bytes, size) {
  return Boolean(SIGNATURES[extension]?.(bytes, size));
}

function readHead(file, length = 128) {
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const read = fs.readSync(fd, buffer, 0, length, 0);
    return buffer.subarray(0, read);
  } finally {
    fs.closeSync(fd);
  }
}

export function removeProjectFiles(files = []) {
  files.forEach((file) => {
    const id = typeof file === 'string' ? file : file?.id || file?.filename;
    if (!id || !/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(id)) return;
    fs.rmSync(path.join(QUOTE_FILES_ROOT, id), { force: true });
  });
}

/* Absolute path of a stored file, or '' for anything that is not one of ours */
export function projectFilePath(id) {
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(String(id || ''))) return '';
  const file = path.join(QUOTE_FILES_ROOT, id);
  return inside(file, QUOTE_FILES_ROOT) ? file : '';
}

/* Original file name made safe for the panel and the download header */
function cleanName(name, extension) {
  const cleaned = String(name || '')
    .replace(/[\\/]/g, '_')
    .replace(/[\u0000-\u001f\u007f"<>|:*?]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(-120);
  return cleaned && extensionOf(cleaned) === extension ? cleaned : `dosya.${extension}`;
}

const upload = multer({
  // Browsers send UTF-8 file names ("çizim.pdf", "رسم.pdf")
  defParamCharset: 'utf8',
  storage: multer.diskStorage({
    destination: QUOTE_FILES_ROOT,
    // Random names: nothing from the visitor ends up in the path
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.${extensionOf(file.originalname)}`),
  }),
  limits: { fileSize: MAX_BYTES, files: PROJECT_MAX_FILES, fields: 2, fieldSize: 64 * 1024, parts: PROJECT_MAX_FILES + 2 },
  fileFilter: (req, file, cb) => {
    if (PROJECT_FILE_TYPES.includes(extensionOf(file.originalname))) cb(null, true);
    else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'files'));
  },
}).array('files', PROJECT_MAX_FILES);

const MESSAGES = {
  LIMIT_FILE_SIZE: `Each file can be at most ${PROJECT_MAX_FILE_MB} MB.`,
  LIMIT_FILE_COUNT: `At most ${PROJECT_MAX_FILES} files can be attached.`,
  LIMIT_UNEXPECTED_FILE: 'This file type cannot be attached.',
};

/*
  multipart/form-data: `data` (the brief as JSON) and up to five `files`.
  Afterwards req.body is the brief and req.projectFiles the checked files.
  Every stored file is deleted again when anything is wrong.
*/
export function projectUpload(req, res, next) {
  upload(req, res, (error) => {
    const stored = Array.isArray(req.files) ? req.files : [];
    const fail = (status, message) => {
      removeProjectFiles(stored);
      return res.status(status).json({ success: false, message });
    };

    if (error) {
      return fail(400, MESSAGES[error.code] || 'The files could not be read.');
    }

    for (const file of stored) {
      const extension = extensionOf(file.filename);
      let valid = false;
      try {
        valid = inside(path.resolve(file.path), QUOTE_FILES_ROOT) && matchesProjectFile(extension, readHead(file.path), file.size);
      } catch {
        valid = false;
      }
      if (!valid) return fail(400, `“${cleanName(file.originalname, extension)}” is not a valid ${extension.toUpperCase()} file.`);
    }

    let data = null;
    try {
      data = JSON.parse(typeof req.body?.data === 'string' ? req.body.data : '');
    } catch {
      data = null;
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return fail(400, 'Please check the submitted information.');
    }

    req.body = data;
    req.projectFiles = stored.map((file) => ({
      id: file.filename,
      name: cleanName(file.originalname, extensionOf(file.filename)),
      size: file.size,
      type: extensionOf(file.filename),
    }));

    // A request that is not saved leaves no files behind
    res.on('finish', () => {
      if (res.statusCode >= 400) removeProjectFiles(req.projectFiles);
    });

    return next();
  });
}
