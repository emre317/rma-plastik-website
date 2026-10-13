import mongoose from 'mongoose';

import { OFFER_CURRENCIES } from './QuoteRequest.js';

/*
  Monthly sales target set by an admin: an amount in one currency (offers
  won that month, without VAT) and optionally a number of won requests.
*/
const salesTargetSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    currency: { type: String, enum: OFFER_CURRENCIES, default: 'USD' },
    amount: { type: Number, min: 0, max: 1e11, default: 0 },
    deals: { type: Number, min: 0, max: 100000, default: 0 },
    updatedBy: { type: String, trim: true, default: '', maxlength: 120 },
  },
  { timestamps: true }
);

const SalesTarget = mongoose.model('SalesTarget', salesTargetSchema);

export default SalesTarget;
