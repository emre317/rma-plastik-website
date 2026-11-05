import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';

import { UPLOAD_ROOT } from '../middleware/upload.js';

/*
  YouTube cover images served from our own server (KVKK technical note C):
  the visitor's browser never contacts i.ytimg.com. The server fetches a cover
  once and keeps it in uploads/yt/.
    GET /api/yt-thumb/<video id>/<hqdefault|maxresdefault>
*/
const router = express.Router();

const SIZES = new Set(['hqdefault', 'maxresdefault', 'mqdefault']);
const FOLDER = path.join(UPLOAD_ROOT, 'yt');

router.get('/:id/:size', async (req, res) => {
  const { id, size } = req.params;
  if (!/^[\w-]{11}$/.test(id) || !SIZES.has(size)) return res.status(404).end();

  const file = path.join(FOLDER, `${id}-${size}.jpg`);
  res.set('Cache-Control', 'public, max-age=2592000');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');

  try {
    return res.type('jpg').send(await fs.readFile(file));
  } catch {
    // Not cached yet
  }

  try {
    const response = await fetch(`https://i.ytimg.com/vi/${id}/${size}.jpg`, { signal: AbortSignal.timeout(8000) });
    // YouTube answers a missing maxres cover with a small grey placeholder (120 px wide)
    const image = response.ok ? Buffer.from(await response.arrayBuffer()) : null;
    if (!image || image.length < 2000) return res.status(404).end();

    await fs.mkdir(FOLDER, { recursive: true });
    await fs.writeFile(file, image);
    return res.type('jpg').send(image);
  } catch (error) {
    console.error('Video cover error:', error.message);
    return res.status(502).end();
  }
});

export default router;
