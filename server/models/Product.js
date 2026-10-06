import mongoose from 'mongoose';

export const PRODUCT_CATEGORIES = [
  'industrial-tanks',
  'chemical-tanks',
  'water-tanks',
  'agriculture',
  'custom',
];

export const CONTENT_LANGUAGES = ['tr', 'en', 'ar'];

export const PRODUCT_TEXT_FIELDS = {
  name: 150,
  categoryLabel: 100,
  capacity: 100,
  material: 100,
  application: 150,
  technology: 100,
  description: 2000,
};

const textSchema = new mongoose.Schema(
  Object.fromEntries(
    Object.entries(PRODUCT_TEXT_FIELDS).map(([field, maxlength]) => [
      field,
      { type: String, trim: true, default: '', maxlength },
    ])
  ),
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      maxlength: 120,
    },

    category: {
      type: String,
      enum: PRODUCT_CATEGORIES,
      required: true,
    },

    // English name sent with quote requests (consistent in the admin panel)
    quoteName: { type: String, trim: true, required: true, maxlength: 150 },

    order: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },

    // Path under /uploads, e.g. /uploads/products/abc.webp
    image: { type: String, trim: true, default: '', maxlength: 300 },

    i18n: {
      tr: { type: textSchema, default: () => ({}) },
      en: { type: textSchema, default: () => ({}) },
      ar: { type: textSchema, default: () => ({}) },
    },

    // Commerce fields – stored now, not shown on the site until e-commerce is enabled
    commerce: {
      sku: { type: String, trim: true, default: '', maxlength: 80 },
      price: { type: Number, min: 0, default: null },
      currency: { type: String, enum: ['TRY', 'USD', 'EUR'], default: 'TRY' },
      stock: { type: Number, min: 0, default: null },
      purchasable: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

productSchema.index({ order: 1, createdAt: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
