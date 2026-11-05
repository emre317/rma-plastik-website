import mongoose from 'mongoose';

/*
  Ret listesi: e-mail addresses and phone numbers whose marketing consent was
  taken back, so no further marketing is sent to them (KVKK technical note
  B.4). Only the contact and the date are kept, with no expiry, for as long as
  marketing messages are sent. Check it before any marketing send.
*/
const suppressionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['email', 'phone'], required: true },
    value: { type: String, trim: true, lowercase: true, required: true, maxlength: 254 },
    withdrawnAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

suppressionSchema.index({ type: 1, value: 1 }, { unique: true });

const Suppression = mongoose.model('Suppression', suppressionSchema);

export default Suppression;
