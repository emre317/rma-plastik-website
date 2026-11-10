import mongoose from 'mongoose';

import { CONTENT_LANGUAGES } from '../config/languages.js';
import { CERTIFICATE_CATEGORIES } from '../../client/src/data/certificates.builtin.js';

const textSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '', maxlength: 160 },
    scope: { type: String, trim: true, default: '', maxlength: 1200 },
  },
  { _id: false }
);

/* Quality / management system certificate (Kalite ve Sertifikalar page) */
const certificateSchema = new mongoose.Schema(
  {
    // e.g. "ISO 9001:2015"
    code: { type: String, trim: true, required: true, maxlength: 60 },
    category: { type: String, enum: CERTIFICATE_CATEGORIES, default: 'quality' },
    number: { type: String, trim: true, default: '', maxlength: 60 },
    holder: { type: String, trim: true, default: '', maxlength: 160 },
    issuer: { type: String, trim: true, default: '', maxlength: 120 },
    accreditation: { type: String, trim: true, default: '', maxlength: 120 },
    issuedAt: { type: Date, default: null },
    validUntil: { type: Date, default: null },
    // /uploads/certificates/… or a built-in /documents/… / /images/… path
    file: { type: String, trim: true, default: '', maxlength: 300 },
    image: { type: String, trim: true, default: '', maxlength: 300 },
    verifyUrl: { type: String, trim: true, default: '', maxlength: 300 },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    i18n: Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, { type: textSchema, default: () => ({}) }])),
  },
  { timestamps: true }
);

certificateSchema.index({ order: 1, createdAt: 1 });

export default mongoose.model('Certificate', certificateSchema);
