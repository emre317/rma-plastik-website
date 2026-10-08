import mongoose from 'mongoose';

import { CONTENT_LANGUAGES } from '../config/languages.js';

const textSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '', maxlength: 80 },
    region: { type: String, trim: true, default: '', maxlength: 80 },
  },
  { _id: false }
);

/* Export market shown on the Global section map (İhracat ağı) */
const exportMarketSchema = new mongoose.Schema(
  {
    // ISO 3166-1 alpha-2, e.g. "BG"
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, match: /^[A-Z]{2}$/ },
    labelPosition: { type: String, enum: ['top', 'bottom', 'left', 'right'], default: 'top' },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    i18n: Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, { type: textSchema, default: () => ({}) }])),
  },
  { timestamps: true }
);

exportMarketSchema.index({ order: 1, createdAt: 1 });

export default mongoose.model('ExportMarket', exportMarketSchema);
