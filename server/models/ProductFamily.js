import mongoose from 'mongoose';

import { CONTENT_LANGUAGES } from '../config/languages.js';

/*
  Product table family (e.g. "Dikey Tanklar") managed in the admin panel:
  texts in 3 languages, a column set and rows of measurements.
  Shown on /product-tables; families marked as water tank also feed /water-tanks.
*/

// Categories of the first version; a table now joins a product group (ProductGroup.groupId)
export const LEGACY_GROUPS = ['tanks', 'textile', 'chemical', 'food', 'other'];

export const COLUMN_KEYS = [
  'volume', 'diameter', 'height', 'length', 'width', 'cap', 'outlet', 'wheel', 'conical',
  'reducer', 'upperLength', 'bottomLength', 'upperDiameter', 'bottomDiameter', 'camber', 'throat', 'weight',
];

export const WATER_USES = ['water', 'food', 'chemical', 'acid'];

const textSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '', maxlength: 120 },
    text: { type: String, trim: true, default: '', maxlength: 800 },
  },
  { _id: false }
);

const rowSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true, required: true, maxlength: 60 },
    image: { type: String, trim: true, default: '', maxlength: 300 },
    // { volume: 1000, diameter: 102, cap: '40-60', ... } – keys from COLUMN_KEYS
    values: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const productFamilySchema = new mongoose.Schema(
  {
    familyId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]{2,80}$/, 'Kimlik yalnızca küçük harf, rakam ve tire içerebilir.'],
    },
    // Product group the table belongs to (ProductGroup.groupId)
    group: { type: String, trim: true, default: '', maxlength: 60 },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
    image: { type: String, trim: true, default: '', maxlength: 300 },
    columns: {
      type: [{ type: String, enum: COLUMN_KEYS }],
      default: ['volume'],
    },
    i18n: Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, { type: textSchema, default: () => ({}) }])),
    rows: { type: [rowSchema], default: [] },
    waterTank: {
      enabled: { type: Boolean, default: false },
      orientation: { type: String, enum: ['vertical', 'horizontal'], default: 'vertical' },
      layer: { type: String, enum: ['single', 'double'], default: 'single' },
      uses: { type: [{ type: String, enum: WATER_USES }], default: ['water'] },
    },
  },
  { timestamps: true }
);

export default mongoose.model('ProductFamily', productFamilySchema);
