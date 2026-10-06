import mongoose from 'mongoose';

const textSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '', maxlength: 160 },
    excerpt: { type: String, trim: true, default: '', maxlength: 400 },
    // Markdown
    body: { type: String, default: '', maxlength: 60000 },
    seoTitle: { type: String, trim: true, default: '', maxlength: 70 },
    seoDescription: { type: String, trim: true, default: '', maxlength: 170 },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
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
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishedAt: { type: Date, default: null },
    coverImage: { type: String, trim: true, default: '', maxlength: 300 },
    // YouTube video shown under the article (optional)
    youtubeId: { type: String, trim: true, default: '', match: /^$|^[A-Za-z0-9_-]{11}$/ },
    // Product slugs linked at the end of the article
    relatedProducts: [{ type: String, trim: true, maxlength: 120 }],
    i18n: {
      tr: { type: textSchema, default: () => ({}) },
      en: { type: textSchema, default: () => ({}) },
      ar: { type: textSchema, default: () => ({}) },
    },
  },
  { timestamps: true }
);

postSchema.index({ status: 1, publishedAt: -1 });

export default mongoose.model('Post', postSchema);
