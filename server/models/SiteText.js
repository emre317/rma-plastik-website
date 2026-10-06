import mongoose from 'mongoose';

/*
  Override of one site text (a locale key such as "hero.title").
  Empty language values fall back to the built-in default text.
*/
const siteTextSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 200,
      match: /^[A-Za-z0-9_.-]+$/,
    },
    tr: { type: String, default: '', maxlength: 5000 },
    en: { type: String, default: '', maxlength: 5000 },
    ar: { type: String, default: '', maxlength: 5000 },
  },
  { timestamps: true }
);

const SiteText = mongoose.model('SiteText', siteTextSchema);

export default SiteText;
