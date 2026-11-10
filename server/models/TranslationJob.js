import mongoose from 'mongoose';

/*
  One automatic translation run after a panel save (services/autoTranslate.js),
  so the panel can show "çeviri hazırlanıyor / eklendi / yapılamadı".
  Removed by MongoDB after 7 days.
*/
const translationJobSchema = new mongoose.Schema(
  {
    kind: { type: String, trim: true, default: '', maxlength: 40 },
    refId: { type: String, trim: true, default: '', maxlength: 200 },
    fields: { type: Number, default: 0 },
    translated: { type: Number, default: 0 },
    status: { type: String, enum: ['running', 'done', 'failed'], default: 'running' },
    error: { type: String, trim: true, default: '', maxlength: 300 },
    finishedAt: { type: Date, default: null },
    expireAt: { type: Date, default: () => new Date(Date.now() + 7 * 86400000) },
  },
  { timestamps: true }
);

translationJobSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('TranslationJob', translationJobSchema);
