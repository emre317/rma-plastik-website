import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import multer from 'multer';

const serverRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Outside the application and the site folders in production (UPLOAD_DIR), so
// deployments never touch the images
export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(serverRoot, 'uploads'));

const TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const FOLDERS = ['products', 'posts', 'projects', 'gallery'];

/*
  The declared type is not trusted: the first bytes must match it too
  (a renamed script or HTML file is rejected and deleted).
*/
const SIGNATURES = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};

export function matchesSignature(type, bytes) {
  return Boolean(SIGNATURES[type]?.(bytes));
}

function readHead(file, length = 16) {
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const read = fs.readSync(fd, buffer, 0, length, 0);
    return buffer.subarray(0, read);
  } finally {
    fs.closeSync(fd);
  }
}

FOLDERS.forEach((folder) => fs.mkdirSync(path.join(UPLOAD_ROOT, folder), { recursive: true }));

function imageUploader(folder) {
  return multer({
    storage: multer.diskStorage({
      destination: path.join(UPLOAD_ROOT, folder),
      // Random file names: nothing from the client ends up in the path
      filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${TYPES[file.mimetype]}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      if (TYPES[file.mimetype]) {
        cb(null, true);
      } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
      }
    },
  }).single('image');
}

function uploadHandler(folder) {
  const upload = imageUploader(folder);

  return (req, res) => {
    upload(req, res, (error) => {
      if (error) {
        const message =
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Görsel en fazla 5 MB olabilir.'
            : 'Yalnızca JPG, PNG veya WEBP görsel yüklenebilir.';

        return res.status(400).json({ success: false, message });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Görsel seçilmedi.' });
      }

      // The stored file must really be the image type it claims to be
      let valid = false;
      try {
        valid = matchesSignature(req.file.mimetype, readHead(req.file.path));
      } catch {
        valid = false;
      }

      if (!valid) {
        fs.rmSync(req.file.path, { force: true });
        return res.status(400).json({ success: false, message: 'Dosya geçerli bir JPG, PNG veya WEBP görseli değil.' });
      }

      // The path is ours (random name, fixed folder), never taken from the request
      if (path.dirname(path.resolve(req.file.path)) !== path.join(UPLOAD_ROOT, folder)) {
        fs.rmSync(req.file.path, { force: true });
        return res.status(400).json({ success: false, message: 'Görsel kaydedilemedi.' });
      }

      return res.status(201).json({
        success: true,
        data: { url: `/uploads/${folder}/${req.file.filename}` },
      });
    });
  };
}

export const uploadProductImage = uploadHandler('products');
export const uploadPostImage = uploadHandler('posts');
export const uploadProjectImage = uploadHandler('projects');
export const uploadGalleryImage = uploadHandler('gallery');

/* Offer PDF made in the admin panel, kept in memory only to attach it to the e-mail */
export function offerPdfUpload(req, res, next) {
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    fileFilter: (request, file, cb) => cb(null, file.mimetype === 'application/pdf'),
  }).single('pdf')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.code === 'LIMIT_FILE_SIZE' ? 'Proforma PDF’i en fazla 8 MB olabilir.' : 'Proforma PDF’i okunamadı.',
      });
    }

    // A real PDF starts with "%PDF-"
    if (req.file && req.file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return res.status(400).json({ success: false, message: 'Proforma PDF’i okunamadı.' });
    }

    return next();
  });
}
