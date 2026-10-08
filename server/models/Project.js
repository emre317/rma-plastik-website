import mongoose from 'mongoose';

import { CONTENT_LANGUAGES } from '../config/languages.js';

const textSchema = new mongoose.Schema(
  {
    client: { type: String, trim: true, default: '', maxlength: 160 },
    title: { type: String, trim: true, default: '', maxlength: 200 },
  },
  { _id: false }
);

/* Custom molding reference project (Özel Üretim > Referans projeler) */
const projectSchema = new mongoose.Schema(
  {
    // /uploads/projects/… or a built-in /images/… path
    image: { type: String, trim: true, default: '', maxlength: 300 },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    i18n: Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, { type: textSchema, default: () => ({}) }])),
  },
  { timestamps: true }
);

projectSchema.index({ order: 1, createdAt: 1 });

export default mongoose.model('Project', projectSchema);
