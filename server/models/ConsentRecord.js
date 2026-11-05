import mongoose from 'mongoose';

import { QUOTE_LANGUAGES } from './QuoteRequest.js';

/*
  One record per box shown on a website form (KVKK technical note B.4):
    A        Pazarlama açık rızası
    B-email  Ticari elektronik ileti onayı – e-posta
    B-sms    … – SMS (quote form only)
    B-call   … – telefon araması (quote form only)
    C        Reklam platformlarıyla eşleştirme (hash) açık rızası
  Unticked boxes are recorded too ("hayır"). A consent that is taken back
  keeps its record with `withdrawnAt`; the contact also goes to the
  suppression list (models/Suppression.js).
*/
export const CONSENT_BOXES = ['A', 'B-email', 'B-sms', 'B-call', 'C'];
export const CONSENT_FORMS = ['quote', 'catalog'];

const consentRecordSchema = new mongoose.Schema(
  {
    box: { type: String, enum: CONSENT_BOXES, required: true },
    value: { type: Boolean, required: true },
    // Version of the text the visitor saw, e.g. "A-v1.0"
    textVersion: { type: String, trim: true, required: true, maxlength: 20 },
    form: { type: String, enum: CONSENT_FORMS, required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    language: { type: String, enum: [...QUOTE_LANGUAGES, ''], default: '' },

    // Contact details the consent covers (box A text: e-mail, phone, name, company, country)
    email: { type: String, trim: true, lowercase: true, default: '', maxlength: 254 },
    phone: { type: String, trim: true, default: '', maxlength: 40 },
    name: { type: String, trim: true, default: '', maxlength: 120 },
    company: { type: String, trim: true, default: '', maxlength: 150 },
    country: { type: String, trim: true, default: '', maxlength: 80 },

    givenAt: { type: Date, default: Date.now },
    withdrawnAt: { type: Date, default: null },

    // Empty while a consent stands; see services/retention.js
    expireAt: { type: Date, default: null },
  },
  { timestamps: true }
);

consentRecordSchema.index({ email: 1, box: 1 });
consentRecordSchema.index({ refId: 1 });
consentRecordSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const ConsentRecord = mongoose.model('ConsentRecord', consentRecordSchema);

export default ConsentRecord;
