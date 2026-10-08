import mongoose from 'mongoose';

import { CONTENT_LANGUAGES } from '../config/languages.js';

const textSchema = new mongoose.Schema(
  {
    caption: { type: String, trim: true, default: '', maxlength: 200 },
    location: { type: String, trim: true, default: '', maxlength: 120 },
  },
  { _id: false }
);

/* Photo of an installed product in the field (Saha fotoğrafları) */
const galleryPhotoSchema = new mongoose.Schema(
  {
    image: { type: String, trim: true, required: true, maxlength: 300 },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    i18n: Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, { type: textSchema, default: () => ({}) }])),
  },
  { timestamps: true }
);

galleryPhotoSchema.index({ order: 1, createdAt: 1 });

export default mongoose.model('GalleryPhoto', galleryPhotoSchema);
