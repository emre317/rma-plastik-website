import mongoose from 'mongoose';

import { OFFER_CURRENCIES } from './QuoteRequest.js';

/*
  Monthly sales target set by an admin: one amount per currency (offers won
  that month, without VAT; e.g. USD and TRY in the same month) and
  optionally a number of won requests. `owner` empty = the company target;
  a name = that salesperson's target (matched to the request's "Sorumlu").
*/
const amountSchema = new mongoose.Schema(
  {
    currency: { type: String, enum: OFFER_CURRENCIES, required: true },
    amount: { type: Number, min: 0, max: 1e11, required: true },
  },
  { _id: false }
);

const salesTargetSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    owner: { type: String, trim: true, default: '', maxlength: 120 },
    amounts: { type: [amountSchema], default: [] },
    deals: { type: Number, min: 0, max: 100000, default: 0 },
    updatedBy: { type: String, trim: true, default: '', maxlength: 120 },
  },
  { timestamps: true }
);

// One company target and one target per person each month
salesTargetSchema.index({ month: 1, owner: 1 }, { unique: true });

const SalesTarget = mongoose.model('SalesTarget', salesTargetSchema);

/* Drops the old one-target-per-month index on first use (once per process) */
let indexesReady = null;
export function syncTargetIndexes() {
  indexesReady ||= SalesTarget.syncIndexes().catch((error) => {
    indexesReady = null;
    console.error('Sales target indexes:', error.message);
  });
  return indexesReady;
}

export default SalesTarget;
