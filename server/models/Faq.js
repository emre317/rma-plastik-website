import mongoose from 'mongoose';

import { CONTENT_LANGUAGES } from '../config/languages.js';

// Same list as client/src/data/faq.js (labels in the locale files: faq.topics.*)
export const FAQ_TOPICS = ['delivery', 'installation', 'colours', 'uv', 'warranty', 'products', 'order', 'general'];

const textSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, default: '', maxlength: 300 },
    answer: { type: String, trim: true, default: '', maxlength: 3000 },
  },
  { _id: false }
);

/* One question on the FAQ page (Sık sorulan sorular) */
const faqSchema = new mongoose.Schema(
  {
    topic: { type: String, enum: FAQ_TOPICS, default: 'general' },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    i18n: Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, { type: textSchema, default: () => ({}) }])),
  },
  { timestamps: true }
);

faqSchema.index({ order: 1, createdAt: 1 });

export default mongoose.model('Faq', faqSchema);
