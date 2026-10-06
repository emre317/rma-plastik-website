import mongoose from 'mongoose';

const textSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '', maxlength: 160 },
    description: { type: String, trim: true, default: '', maxlength: 1000 },
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    youtubeId: { type: String, required: true, unique: true, trim: true, match: /^[A-Za-z0-9_-]{11}$/ },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    // YouTube upload date – needed for Google video rich results
    uploadDate: { type: Date, default: null },
    i18n: {
      tr: { type: textSchema, default: () => ({}) },
      en: { type: textSchema, default: () => ({}) },
      ar: { type: textSchema, default: () => ({}) },
    },
  },
  { timestamps: true }
);

videoSchema.index({ order: 1, createdAt: -1 });

export default mongoose.model('Video', videoSchema);
