import mongoose from 'mongoose';

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
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    country: {
      type: String,
      trim: true,
      default: '',
    },

    product: {
      type: String,
      trim: true,
      default: '',
    },

    capacity: {
      type: String,
      trim: true,
      default: '',
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
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    status: {
      type: String,

      enum: [
        'new',
        'reviewing',
        'contacted',
        'quoted',
        'closed',
      ],

      default: 'new',
    },

    source: {
      type: String,
      default: 'website',
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

const QuoteRequest = mongoose.model(
  'QuoteRequest',
  quoteRequestSchema
);

export default QuoteRequest;