import mongoose from 'mongoose';

import { CONTENT_LANGUAGES } from '../config/languages.js';

/*
  Sector (Sektör, e.g. "Tekstil") managed in the admin panel: introduction in
  3 languages and the products used in it. A product points at a product group
  (optionally at some of its tables) under the name used in that sector;
  without a group it is a made-to-order item.
*/

// Icons the site can draw (client/src/data/sectorIcons.js)
export const SECTOR_ICONS = [
  'droplets', 'filter', 'shirt', 'utensils', 'flask', 'traffic', 'trees', 'layers',
  'factory', 'tractor', 'ship', 'truck', 'building', 'fuel', 'leaf', 'warehouse', 'wrench', 'package',
];

// Stored product suggested in the quote form
export const SECTOR_STORED = ['', 'water', 'food', 'acid', 'caustic', 'adblue', 'fuel'];

const nameSchema = new mongoose.Schema(
  { name: { type: String, trim: true, default: '', maxlength: 120 } },
  { _id: false }
);

const textSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '', maxlength: 80 },
    description: { type: String, trim: true, default: '', maxlength: 400 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    group: { type: String, trim: true, default: '', maxlength: 60 },
    families: { type: [{ type: String, trim: true, maxlength: 80 }], default: [] },
    i18n: Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, { type: nameSchema, default: () => ({}) }])),
  },
  { _id: false }
);

const sectorSchema = new mongoose.Schema(
  {
    sectorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]{2,60}$/, 'Adres yalnızca küçük harf, rakam ve tire içerebilir.'],
    },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
    icon: { type: String, enum: SECTOR_ICONS, default: 'layers' },
    hue: { type: Number, min: 0, max: 360, default: 210 },
    stored: { type: String, enum: SECTOR_STORED, default: '' },
    i18n: Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, { type: textSchema, default: () => ({}) }])),
    products: { type: [productSchema], default: [] },
  },
  { timestamps: true }
);

sectorSchema.index({ order: 1, createdAt: 1 });

export default mongoose.model('Sector', sectorSchema);
