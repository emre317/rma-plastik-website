import mongoose from 'mongoose';

import { CONTENT_LANGUAGES } from '../config/languages.js';

/*
  Product group (Ürün Grubu, e.g. "Dikey Tanklar") managed in the admin panel:
  menu and Products page entry in 3 languages, a photo and how it is offered.
  Product tables join a group through their `group` field.
*/

// Where the group's "Modelleri İncele" opens
export const GROUP_PAGES = ['tables', 'waterTanks', 'custom'];

// Main category: the tabs above the home page product cards
export const GROUP_CATEGORIES = ['tanks', 'textile', 'chemical', 'food', 'other'];

const textSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '', maxlength: 60 },
    title: { type: String, trim: true, default: '', maxlength: 120 },
    description: { type: String, trim: true, default: '', maxlength: 600 },
    application: { type: String, trim: true, default: '', maxlength: 80 },
  },
  { _id: false }
);

const productGroupSchema = new mongoose.Schema(
  {
    groupId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[A-Za-z0-9-]{2,60}$/, 'Kimlik yalnızca harf, rakam ve tire içerebilir.'],
    },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
    image: { type: String, trim: true, default: '', maxlength: 300 },
    hue: { type: Number, min: 0, max: 360, default: 210 },
    // Made to order: no model table, the card asks for a quote
    quoteOnly: { type: Boolean, default: false },
    // One-piece (monoblock) product: shown as a trust badge on model pages
    monoblock: { type: Boolean, default: true },
    page: { type: String, enum: GROUP_PAGES, default: 'tables' },
    // No default: groups saved before this field take the built-in group's category
    category: { type: String, enum: GROUP_CATEGORIES },
    i18n: Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, { type: textSchema, default: () => ({}) }])),
  },
  { timestamps: true }
);

productGroupSchema.index({ order: 1, createdAt: 1 });

export default mongoose.model('ProductGroup', productGroupSchema);
