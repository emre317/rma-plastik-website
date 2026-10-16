import crypto from 'node:crypto';

import { markSnapshot } from '../services/publisher.js';

/*
  Machine-to-machine access (no admin login):
    CONTENT_API_TOKEN       the site build reads GET /api/content
    PUBLISH_CALLBACK_TOKEN  the publish workflow reports its stages
  Both are sent as "Authorization: Bearer <token>" and compared in constant time.
*/

function bearer(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export function tokenMatches(given, expected) {
  if (!given || !expected) return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

const deny = (res, status, message) => res.status(status).json({ success: false, message });

/*
  Without CONTENT_API_TOKEN the snapshot stays open in development only
  (local "npm run build" keeps working); production refuses it.
*/
export function requireContentToken(req, res, next) {
  const expected = process.env.CONTENT_API_TOKEN;

  if (!expected) {
    if (process.env.NODE_ENV === 'production') return deny(res, 503, 'Content snapshot is not configured.');
    return next();
  }

  if (!tokenMatches(bearer(req), expected)) return deny(res, 401, 'Unauthorized.');

  // The publish job learns when its content was taken (publishedAt uses it)
  const publishId = typeof req.query.publishId === 'string' ? req.query.publishId.slice(0, 60) : '';
  if (publishId) markSnapshot(publishId).catch((error) => console.warn('[publish] snapshot mark:', error.message));

  return next();
}

export function requireCallbackToken(req, res, next) {
  const expected = process.env.PUBLISH_CALLBACK_TOKEN;
  if (!expected) return deny(res, 503, 'Publish callback is not configured.');
  if (!tokenMatches(bearer(req), expected)) return deny(res, 401, 'Unauthorized.');
  return next();
}
