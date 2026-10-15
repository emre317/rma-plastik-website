import mongoose from 'mongoose';

import attributionSchema from './attributionSchema.js';

export const DESIGN_INPUTS = ['drawing', 'sample', 'idea'];
export const QUOTE_NEEDS = ['fittings', 'color', 'installation', 'shipping', 'urgent'];

export const QUOTE_LANGUAGES = [
  'tr',
  'en',
  'ar',
];

export const OFFER_CURRENCIES = ['TRY', 'USD', 'EUR'];

// Result of a closed request; lost requests keep the main reason
export const QUOTE_OUTCOMES = ['won', 'lost'];

export const LOSS_REASONS = ['price', 'leadTime', 'competitor', 'noResponse', 'specs', 'postponed', 'other'];

export const QUOTE_STATUSES = [
  'new',
  'reviewing',
  'contacted',
  'quoted',
  'closed',
];

const quoteRequestSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: 40,
    },

    country: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },

    product: {
      type: String,
      trim: true,
      default: '',
      maxlength: 150,
    },

    // Selected catalogue model, e.g. "Dikey Tanklar · RD 100 · Hacim (lt): 100 · Çap (cm): 48"
    productDetails: {
      type: String,
      trim: true,
      default: '',
      maxlength: 600,
    },

    // Quote cart: several catalogue models with quantities
    items: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, trim: true, maxlength: 150, required: true },
            details: { type: String, trim: true, default: '', maxlength: 600 },
            image: { type: String, trim: true, default: '', maxlength: 300 },
            quantity: { type: Number, min: 1, max: 99999, default: 1 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    // Site-relative image of the selected model (/images/...)
    productImage: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },

    capacity: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },

    quantity: {
      type: Number,
      min: 1,
      default: null,
    },

    application: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200,
    },

    // Tank contents: what is stored, its density and temperatures
    storedProduct: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200,
    },

    density: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },

    temperature: {
      type: String,
      trim: true,
      default: '',
      maxlength: 160,
    },

    deliveryCity: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200,
    },

    // Custom part: description / dimensions and what the customer already has
    customSpec: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },

    designInput: {
      type: String,
      enum: ['', ...DESIGN_INPUTS],
      default: '',
    },

    // Follow-up needs picked with one click (fittings, colour, installation…)
    needs: {
      type: [{ type: String, enum: QUOTE_NEEDS }],
      default: [],
    },

    // Optional since the form asks structured questions (needs, stored product…)
    message: {
      type: String,
      trim: true,
      default: '',
      maxlength: 5000,
    },

    status: {
      type: String,

      enum: QUOTE_STATUSES,

      default: 'new',
    },

    source: {
      type: String,
      default: 'website',
    },

    // Site language the customer used when submitting the request
    language: {
      type: String,
      enum: [...QUOTE_LANGUAGES, ''],
      default: '',
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    // Sales follow-up (admin only, never shown to the customer)
    assignee: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },

    followUpAt: {
      type: Date,
      default: null,
    },

    // Won / lost (set together with the "closed" status)
    outcome: {
      type: String,
      enum: [...QUOTE_OUTCOMES, ''],
      default: '',
    },

    lossReason: {
      type: String,
      enum: [...LOSS_REASONS, ''],
      default: '',
    },

    outcomeNote: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },

    outcomeAt: {
      type: Date,
      default: null,
    },

    // Where the visitor came from (first page of the visit, campaign tags)
    attribution: {
      type: attributionSchema,
      default: null,
    },

    // Commercial offer prepared in the admin panel (prices are entered by the sales team)
    offer: {
      type: new mongoose.Schema(
        {
          revision: { type: Number, default: 1, min: 1 },
          language: { type: String, enum: QUOTE_LANGUAGES, default: 'tr' },
          currency: { type: String, enum: OFFER_CURRENCIES, default: 'TRY' },
          lines: {
            type: [
              new mongoose.Schema(
                {
                  name: { type: String, trim: true, required: true, maxlength: 200 },
                  details: { type: String, trim: true, default: '', maxlength: 600 },
                  quantity: { type: Number, min: 0, max: 1000000, default: 1 },
                  unit: { type: String, trim: true, default: '', maxlength: 20 },
                  unitPrice: { type: Number, min: 0, max: 1e10, default: 0 },
                  discount: { type: Number, min: 0, max: 100, default: 0 },
                },
                { _id: false }
              ),
            ],
            default: [],
          },
          vatRate: { type: Number, min: 0, max: 100, default: null },
          incoterm: { type: String, trim: true, default: '', maxlength: 20 },
          deliveryPlace: { type: String, trim: true, default: '', maxlength: 160 },
          deliveryTime: { type: String, trim: true, default: '', maxlength: 160 },
          paymentTerms: { type: String, trim: true, default: '', maxlength: 300 },
          validUntil: { type: Date, default: null },
          notes: { type: String, trim: true, default: '', maxlength: 2000 },
          terms: { type: String, trim: true, default: '', maxlength: 3000 },
          preparedBy: { type: String, trim: true, default: '', maxlength: 120 },
          savedAt: { type: Date, default: null },
          sentAt: { type: Date, default: null },
          sentTo: { type: String, trim: true, default: '', maxlength: 254 },
        },
        { _id: false }
      ),
      default: null,
    },

    notes: {
      type: [
        new mongoose.Schema(
          {
            text: { type: String, trim: true, required: true, maxlength: 2000 },
            author: { type: String, trim: true, default: '', maxlength: 120 },
          },
          { timestamps: { createdAt: true, updatedAt: false } }
        ),
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

quoteRequestSchema.index({
  createdAt: -1,
});

quoteRequestSchema.index({
  status: 1,
});

quoteRequestSchema.index({
  isRead: 1,
});

quoteRequestSchema.index({
  followUpAt: 1,
});

quoteRequestSchema.index({
  email: 1,
});

const QuoteRequest = mongoose.model(
  'QuoteRequest',
  quoteRequestSchema
);

export default QuoteRequest;