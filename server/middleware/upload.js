import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import multer from 'multer';

const serverRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(serverRoot, 'uploads'));

const TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const FOLDERS = ['products', 'posts', 'projects'];

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
