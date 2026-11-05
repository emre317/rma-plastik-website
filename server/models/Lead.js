import mongoose from 'mongoose';

import attributionSchema from './attributionSchema.js';
import { QUOTE_LANGUAGES } from './QuoteRequest.js';

/*
  Potential customer from the website: a visitor who left their e-mail to
  download the product catalogue. One record per e-mail address; a repeat
  download updates it.
*/
const leadSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
    name: { type: String, trim: true, default: '', maxlength: 120 },
    company: { type: String, trim: true, default: '', maxlength: 150 },
    country: { type: String, trim: true, default: '', maxlength: 80 },
    language: { type: String, enum: [...QUOTE_LANGUAGES, ''], default: '' },

    // What was downloaded, e.g. "catalog"
    source: { type: String, trim: true, default: 'catalog', maxlength: 40 },

    // A marketing consent (box A or B) stands; the boxes themselves are in
    // ConsentRecord. Older records: the single checkbox of the first form.
    marketingConsent: { type: Boolean, default: false },
    consentAt: { type: Date, default: null },

    // Company given and not a free mail address: sales may follow up (KVKK B.3)
    salesFollowUp: { type: Boolean, default: false },

    // Deleted by MongoDB 2 years after the last download (services/retention.js);
    // empty while a marketing consent stands
    expireAt: { type: Date, default: null },

    downloads: { type: Number, default: 1, min: 0 },
    lastDownloadAt: { type: Date, default: Date.now },

    isRead: { type: Boolean, default: false },

    attribution: { type: attributionSchema, default: null },
  },
  { timestamps: true }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ isRead: 1 });
leadSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
