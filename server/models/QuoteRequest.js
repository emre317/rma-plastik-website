import mongoose from 'mongoose';

export const QUOTE_LANGUAGES = [
  'tr',
  'en',
  'ar',
];

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

    message: {
      type: String,
      required: true,
      trim: true,
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

const QuoteRequest = mongoose.model(
  'QuoteRequest',
  quoteRequestSchema
);

export default QuoteRequest;