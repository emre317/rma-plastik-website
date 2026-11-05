import mongoose from 'mongoose';

import attributionSchema from './attributionSchema.js';
import { QUOTE_LANGUAGES } from './QuoteRequest.js';
import { MEETING_DEFAULT_DURATION, MEETING_TOPICS, MEETING_TYPES } from '../../client/src/data/meetingForm.js';
import { quoteExpiry } from '../services/retention.js';

/*
  Meeting request from the website (Toplantı Talebi): face to face at the
  plant or online (Microsoft Teams). The visitor proposes a time; the panel
  confirms it (possibly at another time), names the RMA staff who attend and,
  for online meetings, adds the Teams link. Every change mails the customer
  (and the online guests) and the staff, with a calendar invitation.
    pending    new request, waiting for the panel
    confirmed  time, staff (and link) set; invitations sent
    cancelled  declined or called off
*/
export const MEETING_STATUSES = ['pending', 'confirmed', 'cancelled'];

const mailStatusSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['sent', 'failed', 'skipped'], required: true },
    at: { type: Date, default: Date.now },
    error: { type: String, trim: true, default: '', maxlength: 300 },
    attempts: { type: Number, default: 1 },
  },
  { _id: false }
);

const personSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '', maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, required: true, maxlength: 254 },
  },
  { _id: false }
);

const staffSchema = new mongoose.Schema(
  {
    // Panel account, when the person has one (else typed in by hand)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    name: { type: String, trim: true, required: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, required: true, maxlength: 254 },
    title: { type: String, trim: true, default: '', maxlength: 80 },
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    type: { type: String, enum: MEETING_TYPES, required: true },
    status: { type: String, enum: MEETING_STATUSES, default: 'pending' },

    // Contact details of the visitor
    company: { type: String, trim: true, required: true, maxlength: 150 },
    name: { type: String, trim: true, required: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, required: true, maxlength: 254 },
    phone: { type: String, trim: true, default: '', maxlength: 40 },
    country: { type: String, trim: true, default: '', maxlength: 80 },

    topic: { type: String, enum: MEETING_TOPICS, required: true },
    subject: { type: String, trim: true, default: '', maxlength: 200 },
    message: { type: String, trim: true, default: '', maxlength: 2000 },

    // Online: other people from the visitor's side
    guests: { type: [personSchema], default: [] },

    language: { type: String, enum: [...QUOTE_LANGUAGES, ''], default: '' },

    // What the visitor asked for, and what the panel set
    requestedStartAt: { type: Date, required: true },
    startAt: { type: Date, required: true },
    durationMinutes: { type: Number, min: 15, max: 480, default: MEETING_DEFAULT_DURATION },

    staff: { type: [staffSchema], default: [] },
    // Face to face: where (the plant address unless changed)
    location: { type: String, trim: true, default: '', maxlength: 300 },
    // Online: the Teams link (made by the API through Microsoft Graph, or pasted in)
    joinUrl: { type: String, trim: true, default: '', maxlength: 1000 },
    teams: {
      eventId: { type: String, default: '', maxlength: 400 },
      organizer: { type: String, default: '', maxlength: 254 },
    },
    // Short note for the customer in the confirmation / cancellation e-mail
    customerNote: { type: String, trim: true, default: '', maxlength: 1000 },
    // Internal note, never e-mailed to the customer
    internalNote: { type: String, trim: true, default: '', maxlength: 2000 },

    // Calendar invitation revision (iCalendar SEQUENCE): goes up with every change
    sequence: { type: Number, default: 0 },

    confirmedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    handledBy: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: '' },
    },

    isRead: { type: Boolean, default: false },

    mail: {
      notification: { type: mailStatusSchema, default: undefined },
      receipt: { type: mailStatusSchema, default: undefined },
      customer: { type: mailStatusSchema, default: undefined },
      staff: { type: mailStatusSchema, default: undefined },
    },

    attribution: { type: attributionSchema, default: undefined },

    // KVKK: deleted with the same rule as quote requests (services/retention.js)
    expireAt: { type: Date, default: () => quoteExpiry(new Date()) },
  },
  { timestamps: true }
);

meetingSchema.index({ status: 1, startAt: 1 });
meetingSchema.index({ createdAt: -1 });
meetingSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Meeting', meetingSchema);
