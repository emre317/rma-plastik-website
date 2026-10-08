import mongoose from 'mongoose';

/* Visit source of a quote request or catalogue download (services/attribution.js) */
const attributionSchema = new mongoose.Schema(
  {
    channel: { type: String, trim: true, default: '', maxlength: 40 },
    landingPage: { type: String, trim: true, default: '', maxlength: 300 },
    submitPage: { type: String, trim: true, default: '', maxlength: 300 },
    referrer: { type: String, trim: true, default: '', maxlength: 300 },
    utmSource: { type: String, trim: true, default: '', maxlength: 100 },
    utmMedium: { type: String, trim: true, default: '', maxlength: 100 },
    utmCampaign: { type: String, trim: true, default: '', maxlength: 150 },
    utmTerm: { type: String, trim: true, default: '', maxlength: 150 },
    utmContent: { type: String, trim: true, default: '', maxlength: 150 },
    clickId: { type: String, trim: true, default: '', maxlength: 20 },
    clickIdValue: { type: String, trim: true, default: '', maxlength: 200 },
    firstSeenAt: { type: Date, default: null },
  },
  { _id: false }
);

export default attributionSchema;
