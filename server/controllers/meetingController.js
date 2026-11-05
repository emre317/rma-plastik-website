import mongoose from 'mongoose';

import Meeting, { MEETING_OUTCOMES, MEETING_STATUSES } from '../models/Meeting.js';
import QuoteRequest from '../models/QuoteRequest.js';
import MeetingBlock from '../models/MeetingBlock.js';
import { clearAvailabilityCache, confirmConflicts, isSlotFree, takenSlots } from '../services/meetingAvailability.js';
import AdminUser from '../models/AdminUser.js';
import { QUOTE_LANGUAGES } from '../models/QuoteRequest.js';
import { cleanAttribution } from '../services/attribution.js';
import { isMailConfigured } from '../services/mailer.js';
import { cancelTeamsMeeting, isTeamsConfigured, saveTeamsMeeting, teamsOrganizer } from '../services/teams.js';
import { reminderHours, remindersEnabled } from '../services/meetingReminders.js';
import {
  formatWhen,
  meetingReference,
  sendCustomerMeetingEmail,
  sendMeetingNotification,
  sendStaffMeetingEmail,
  trackMeetingMail,
} from '../services/meetingEmail.js';
import {
  MEETING_DURATIONS,
  MEETING_MAX_GUESTS,
  MEETING_TOPIC_LABELS,
  MEETING_TOPICS,
  MEETING_TYPES,
  istanbulDateTime,
  isRequestableStart,
} from '../../client/src/data/meetingForm.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_STAFF = 10;

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const validId = (id) => mongoose.isValidObjectId(id);
const isEmail = (value) => EMAIL_PATTERN.test(value) && value.length <= 254;

/* Online guests: name + e-mail, no duplicates, not the requester again */
export function cleanGuests(list, ownEmail = '') {
  const seen = new Set([ownEmail]);
  const guests = [];

  for (const item of Array.isArray(list) ? list : []) {
    const email = str(item?.email, 254).toLowerCase();
    if (!email && !str(item?.name, 120)) continue;
    if (!isEmail(email)) return { error: 'Please enter a valid e-mail address for every participant.' };
    if (seen.has(email)) continue;
    seen.add(email);
    guests.push({ name: str(item?.name, 120), email });
  }

  if (guests.length > MEETING_MAX_GUESTS) return { error: `At most ${MEETING_MAX_GUESTS} participants can be added.` };
  return { guests };
}

/* ---------- Website ---------- */

/* POST /api/meetings */
export async function createMeeting(req, res) {
  try {
    const body = req.body || {};
    const type = MEETING_TYPES.includes(body.type) ? body.type : '';
    const company = str(body.company, 150);
    const name = str(body.name, 120);
    const email = str(body.email, 254).toLowerCase();
    const phone = str(body.phone, 40);
    const topic = MEETING_TOPICS.includes(body.topic) ? body.topic : '';

    if (!type) return fail(res, 400, 'Please choose a face-to-face or an online meeting.');
    if (!topic) return fail(res, 400, 'Please choose the subject of the meeting.');
    if (!company || !name || !email) return fail(res, 400, 'Please complete all required fields.');
    if (!isEmail(email)) return fail(res, 400, 'Please enter a valid email address.');
    if (phone.replace(/\D/g, '').length < 7) return fail(res, 400, 'Please enter a valid phone number.');

    const startAt = istanbulDateTime(body.date, body.time);
    if (!startAt || !isRequestableStart(startAt)) {
      return fail(res, 400, 'Please choose an available date and time.');
    }

    // Taken in the meantime (another request was confirmed, Outlook, closed time)
    const free = await isSlotFree(startAt).catch((error) => {
      console.error('Meeting slot check error:', error.message);
      return true;
    });
    if (!free) {
      return res.status(409).json({ success: false, code: 'taken', message: 'This time is no longer available. Please choose another time.' });
    }

    const { guests, error } = type === 'online' ? cleanGuests(body.guests, email) : { guests: [] };
    if (error) return fail(res, 400, error);

    const meeting = await Meeting.create({
      type,
      company,
      name,
      email,
      phone,
      country: str(body.country, 80),
      topic,
      subject: str(body.subject, 200),
      message: str(body.message, 2000),
      guests,
      language: QUOTE_LANGUAGES.includes(body.language) ? body.language : '',
      requestedStartAt: startAt,
      startAt,
      attribution: cleanAttribution(body.attribution),
    });

    // A mail failure never fails the request; the result shows in the panel
    trackMeetingMail(meeting._id, 'notification', () => sendMeetingNotification(meeting));
    const receipt = isMailConfigured() && process.env.QUOTE_CONFIRM_CUSTOMER !== 'false';
    if (receipt) trackMeetingMail(meeting._id, 'receipt', () => sendCustomerMeetingEmail(meeting, 'receipt'));

    return res.status(201).json({
      success: true,
      reference: meetingReference(meeting._id),
      confirmation: receipt,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) return fail(res, 400, 'Please check the submitted information.');
    console.error('Create meeting error:', error);
    return fail(res, 500, 'Meeting request could not be sent.');
  }
}

/* GET /api/meetings/availability: taken website slots (no details) */
export async function meetingAvailability(req, res) {
  try {
    const taken = await takenSlots();
    res.set('Cache-Control', 'public, max-age=60');
    return res.json({ success: true, data: { taken } });
  } catch (error) {
    console.error('Meeting availability error:', error);
    // The form still works; the submit is checked again
    return res.json({ success: true, data: { taken: {} } });
  }
}

/* ---------- Closed times (panel) ---------- */

/* GET /api/meetings/blocks: closed times that have not ended */
export async function listMeetingBlocks(req, res) {
  try {
    const blocks = await MeetingBlock.find({ end: { $gt: new Date() } }).sort({ start: 1 }).lean();
    return res.json({ success: true, data: blocks });
  } catch (error) {
    console.error('List meeting blocks error:', error);
    return fail(res, 500, 'Kapalı zamanlar yüklenemedi.');
  }
}

/* POST /api/meetings/blocks { from: "2026-11-10", to: "2026-11-12", allDay, startTime, endTime, note } */
export async function createMeetingBlock(req, res) {
  try {
    const body = req.body || {};
    const fromDay = str(body.from, 10);
    const toDay = str(body.to, 10) || fromDay;
    const allDay = body.allDay !== false;
    const start = istanbulDateTime(fromDay, allDay ? '00:00' : str(body.startTime, 5));
    const endBase = istanbulDateTime(toDay, allDay ? '23:59' : str(body.endTime, 5));
    const end = endBase && allDay ? new Date(endBase.getTime() + 60000) : endBase;

    if (!start || !end) return fail(res, 400, 'Geçerli tarih ve saat girin.');
    if (end <= start) return fail(res, 400, 'Bitiş, başlangıçtan sonra olmalı.');
    if (end.getTime() - start.getTime() > 120 * 86400000) return fail(res, 400, 'En fazla 120 günlük bir aralık kapatılabilir.');
    if (end <= new Date()) return fail(res, 400, 'Geçmiş bir zaman kapatılamaz.');

    const block = await MeetingBlock.create({ start, end, note: str(body.note, 160), createdBy: req.admin?.name || '' });
    clearAvailabilityCache();
    return res.status(201).json({ success: true, data: block });
  } catch (error) {
    console.error('Create meeting block error:', error);
    return fail(res, 500, 'Kapalı zaman eklenemedi.');
  }
}

/* DELETE /api/meetings/blocks/:blockId */
export async function deleteMeetingBlock(req, res) {
  try {
    if (!validId(req.params.blockId)) return fail(res, 404, 'Kayıt bulunamadı.');
    await MeetingBlock.deleteOne({ _id: req.params.blockId });
    clearAvailabilityCache();
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete meeting block error:', error);
    return fail(res, 500, 'Kapalı zaman silinemedi.');
  }
}

/* POST /api/meetings/:id/check { date, time, durationMinutes, staff }: conflicts before confirming */
export async function checkMeetingConflicts(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Toplantı bulunamadı.');
    const start = istanbulDateTime(req.body?.date, req.body?.time);
    if (!start) return res.json({ success: true, data: { meetings: [], blocks: [], busyStaff: [] } });
    const duration = Number(req.body?.durationMinutes);
    const staffEmails = (Array.isArray(req.body?.staff) ? req.body.staff : []).map((person) => str(person?.email, 254).toLowerCase()).filter(isEmail).slice(0, 10);

    const data = await confirmConflicts({
      start,
      durationMinutes: MEETING_DURATIONS.includes(duration) ? duration : 60,
      staffEmails,
      excludeId: req.params.id,
    });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Meeting conflict check error:', error);
    return res.json({ success: true, data: { meetings: [], blocks: [], busyStaff: [] } });
  }
}

/* ---------- Panel ---------- */

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* GET /api/meetings?view=pending|upcoming|past|cancelled|all&type=&search=&page= */
export async function listMeetings(req, res) {
  try {
    const now = new Date();
    const view = String(req.query.view || 'all');
    const filter = {};
    let sort = { createdAt: -1 };

    if (view === 'pending') {
      filter.status = 'pending';
      sort = { startAt: 1 };
    } else if (view === 'upcoming') {
      filter.status = 'confirmed';
      // Still running counts as upcoming for two hours
      filter.startAt = { $gte: new Date(now.getTime() - 2 * 3600 * 1000) };
      sort = { startAt: 1 };
    } else if (view === 'past') {
      filter.status = 'confirmed';
      filter.startAt = { $lt: new Date(now.getTime() - 2 * 3600 * 1000) };
      sort = { startAt: -1 };
    } else if (view === 'results') {
      filter.status = 'confirmed';
      filter.startAt = { $lt: new Date(now.getTime() - 60 * 60000) };
      filter['result.outcome'] = { $in: ['', null] };
      sort = { startAt: -1 };
    } else if (view === 'cancelled') {
      filter.status = 'cancelled';
    }

    if (MEETING_TYPES.includes(req.query.type)) filter.type = req.query.type;

    const search = str(req.query.search, 100);
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ company: pattern }, { name: pattern }, { email: pattern }, { subject: pattern }];
    }

    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 30));
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

    const [data, total] = await Promise.all([
      Meeting.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Meeting.countDocuments(filter),
    ]);

    return res.json({ success: true, data, pagination: { page, pages: Math.max(1, Math.ceil(total / limit)), total } });
  } catch (error) {
    console.error('List meetings error:', error);
    return fail(res, 500, 'Toplantılar yüklenemedi.');
  }
}

/* GET /api/meetings/summary: header strip and sidebar badge */
export async function meetingSummary(req, res) {
  try {
    const now = new Date();
    const from = new Date(now.getTime() - 2 * 3600 * 1000);
    const [pending, unread, upcoming, awaitingResult] = await Promise.all([
      Meeting.countDocuments({ status: 'pending' }),
      Meeting.countDocuments({ status: 'pending', isRead: false }),
      Meeting.find({ status: 'confirmed', startAt: { $gte: from } })
        .sort({ startAt: 1 })
        .limit(5)
        .select('type company name startAt durationMinutes staff joinUrl location')
        .lean(),
      // Held in the last 30 days, ended, no outcome written yet
      Meeting.countDocuments({
        status: 'confirmed',
        startAt: { $gte: new Date(now.getTime() - 30 * 86400000), $lt: new Date(now.getTime() - 60 * 60000) },
        'result.outcome': { $in: ['', null] },
      }),
    ]);

    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, data: { pending, unread, upcoming, awaitingResult, now } });
  } catch (error) {
    console.error('Meeting summary error:', error);
    return fail(res, 500, 'Toplantı özeti yüklenemedi.');
  }
}

/* GET /api/meetings/config */
export function meetingConfig(req, res) {
  return res.json({
    success: true,
    data: { teams: isTeamsConfigured(), organizer: isTeamsConfigured() ? teamsOrganizer() : '', mail: isMailConfigured(), durations: MEETING_DURATIONS, reminders: remindersEnabled(), reminderHours: reminderHours() },
  });
}

/* GET /api/meetings/staff: panel accounts that can be picked as attendees */
export async function listMeetingStaff(req, res) {
  try {
    const users = await AdminUser.find({ isActive: true }).select('name email title').sort({ name: 1 }).lean();
    return res.json({ success: true, data: users.map((user) => ({ userId: user._id, name: user.name, email: user.email, title: user.title || '' })) });
  } catch (error) {
    console.error('Meeting staff error:', error);
    return fail(res, 500, 'Çalışan listesi yüklenemedi.');
  }
}

/* GET /api/meetings/:id (opening it marks it read) */
export async function getMeeting(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Toplantı bulunamadı.');
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return fail(res, 404, 'Toplantı bulunamadı.');

    if (!meeting.isRead) {
      meeting.isRead = true;
      await meeting.save();
    }

    return res.json({ success: true, data: meeting });
  } catch (error) {
    console.error('Get meeting error:', error);
    return fail(res, 500, 'Toplantı yüklenemedi.');
  }
}

/* Staff picked in the panel; panel accounts are read from the database */
async function cleanStaff(list) {
  const staff = [];
  const seen = new Set();

  for (const item of (Array.isArray(list) ? list : []).slice(0, MAX_STAFF * 2)) {
    let person = { userId: null, name: str(item?.name, 120), email: str(item?.email, 254).toLowerCase(), title: str(item?.title, 80) };

    if (item?.userId && validId(item.userId)) {
      const user = await AdminUser.findById(item.userId).select('name email title isActive').lean();
      if (user?.isActive) person = { userId: user._id, name: user.name, email: user.email, title: user.title || '' };
    }

    if (!person.email && !person.name) continue;
    if (!isEmail(person.email)) return { error: `Geçerli bir e-posta adresi girin: ${person.name || person.email}` };
    if (!person.name) person.name = person.email.split('@')[0];
    if (seen.has(person.email)) continue;
    seen.add(person.email);
    staff.push(person);
  }

  if (!staff.length) return { error: 'Toplantıya katılacak en az bir RMA çalışanı seçin.' };
  if (staff.length > MAX_STAFF) return { error: `En fazla ${MAX_STAFF} çalışan eklenebilir.` };
  return { staff };
}

const handler = (req) => ({ id: req.admin?._id || null, name: req.admin?.name || '' });

/* Sends the customer and staff mails, returns { customer, staff } delivery results */
async function notify(meeting, kind, removedStaff = []) {
  const results = await Promise.all([
    trackMeetingMail(meeting._id, 'customer', () => sendCustomerMeetingEmail(meeting, kind)),
    kind === 'declined' ? null : trackMeetingMail(meeting._id, 'staff', () => sendStaffMeetingEmail(meeting, kind === 'cancelled' ? 'cancelled' : kind)),
  ]);

  // People taken off the meeting get a cancellation of their invitation
  if (removedStaff.length) {
    const copy = { ...meeting.toObject(), staff: removedStaff };
    sendStaffMeetingEmail(copy, 'cancelled').catch((error) => console.error('Removed staff email error:', error.message));
  }

  return { customer: results[0], staff: results[1] };
}

const meetingJson = async (id) => Meeting.findById(id);

/*
  POST /api/meetings/:id/confirm
  { date, time, durationMinutes, staff: [{ userId? , name, email, title }],
    location (face to face), useTeams | joinUrl (online), customerNote, internalNote }
  First confirmation or a later change (time, staff, place, link): sends
  invitations / updates to the customer, the guests and the staff.
*/
export async function confirmMeeting(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Toplantı bulunamadı.');
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return fail(res, 404, 'Toplantı bulunamadı.');
    if (meeting.status === 'cancelled') return fail(res, 409, 'İptal edilen toplantı yeniden onaylanamaz; müşteriden yeni bir talep isteyin.');

    const body = req.body || {};
    const startAt = istanbulDateTime(body.date, body.time);
    if (!startAt) return fail(res, 400, 'Geçerli bir tarih ve saat seçin.');
    if (startAt.getTime() < Date.now() - 5 * 60000) return fail(res, 400, 'Toplantı zamanı geçmişte olamaz.');

    const duration = Number(body.durationMinutes);
    const durationMinutes = MEETING_DURATIONS.includes(duration) ? duration : meeting.durationMinutes;

    const { staff, error } = await cleanStaff(body.staff);
    if (error) return fail(res, 400, error);

    const wasConfirmed = meeting.status === 'confirmed';
    const previousStaff = wasConfirmed ? meeting.staff.map((person) => ({ name: person.name, email: person.email, title: person.title })) : [];

    let location = '';
    let joinUrl = '';
    let teams = { eventId: meeting.teams?.eventId || '', organizer: meeting.teams?.organizer || '' };

    if (meeting.type === 'inPerson') {
      location = str(body.location, 300);
      if (!location) return fail(res, 400, 'Yüz yüze görüşmenin yerini (adres) yazın.');
    } else if (body.useTeams && isTeamsConfigured()) {
      try {
        const subject = `RMA Plastik – ${meeting.company}`;
        const bodyHtml = `<p>${[MEETING_TOPIC_LABELS[meeting.topic], meeting.subject].filter(Boolean).join(' – ').replace(/</g, '&lt;')}</p><p>${meetingReference(meeting._id)}</p>`;
        const saved = await saveTeamsMeeting({
          eventId: teams.eventId,
          subject,
          bodyHtml,
          start: startAt,
          durationMinutes,
          attendees: [{ name: meeting.name, email: meeting.email }, ...meeting.guests, ...staff],
        });
        teams = { eventId: saved.eventId, organizer: saved.organizer };
        joinUrl = saved.joinUrl;
      } catch (teamsError) {
        console.error('Teams meeting error:', teamsError.message);
        return fail(res, 502, `Teams toplantısı oluşturulamadı: ${teamsError.message}. Bağlantıyı Teams’ten oluşturup elle yapıştırabilirsiniz.`);
      }
      if (!joinUrl) return fail(res, 502, 'Teams toplantısı oluşturuldu ama bağlantı alınamadı. Bir dakika sonra yeniden deneyin.');
    } else {
      joinUrl = str(body.joinUrl, 1000);
      if (!/^https:\/\/[^\s<>"]+$/i.test(joinUrl)) return fail(res, 400, 'Online toplantı için Teams bağlantısını (https://…) yapıştırın.');
      // Switched from an automatic Teams event to a pasted link: the old event goes
      if (teams.eventId) {
        await cancelTeamsMeeting(teams.eventId, 'Toplantı bağlantısı değiştirildi.').catch((cancelError) => console.error('Teams cancel error:', cancelError.message));
        teams = { eventId: '', organizer: '' };
      }
    }

    meeting.set({
      status: 'confirmed',
      startAt,
      durationMinutes,
      staff,
      location,
      joinUrl,
      teams,
      customerNote: str(body.customerNote, 1000),
      internalNote: str(body.internalNote, 2000),
      sequence: wasConfirmed ? (meeting.sequence || 0) + 1 : meeting.sequence || 0,
      confirmedAt: meeting.confirmedAt || new Date(),
      handledBy: handler(req),
      isRead: true,
    });
    await meeting.save();

    const removedStaff = previousStaff.filter((old) => !staff.some((person) => person.email === old.email));
    clearAvailabilityCache();
    const mail = await notify(meeting, wasConfirmed ? 'updated' : 'confirmed', removedStaff);

    return res.json({ success: true, data: await meetingJson(meeting._id), mail, updated: wasConfirmed });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) return fail(res, 400, Object.values(error.errors)[0]?.message || 'Lütfen alanları kontrol edin.');
    console.error('Confirm meeting error:', error);
    return fail(res, 500, 'Toplantı onaylanamadı.');
  }
}

/* POST /api/meetings/:id/cancel { customerNote, notify } */
export async function cancelMeeting(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Toplantı bulunamadı.');
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return fail(res, 404, 'Toplantı bulunamadı.');
    if (meeting.status === 'cancelled') return fail(res, 409, 'Toplantı zaten iptal edildi.');

    const wasConfirmed = meeting.status === 'confirmed';
    const note = str(req.body?.customerNote, 1000);

    if (meeting.teams?.eventId) {
      // Microsoft tells the attendees and removes it from their calendars
      await cancelTeamsMeeting(meeting.teams.eventId, note).catch((error) => console.error('Teams cancel error:', error.message));
    }

    meeting.set({
      status: 'cancelled',
      cancelledAt: new Date(),
      customerNote: note,
      sequence: (meeting.sequence || 0) + 1,
      handledBy: handler(req),
      isRead: true,
    });
    await meeting.save();

    clearAvailabilityCache();
    const mail = req.body?.notify === false ? null : await notify(meeting, wasConfirmed ? 'cancelled' : 'declined');
    return res.json({ success: true, data: await meetingJson(meeting._id), mail });
  } catch (error) {
    console.error('Cancel meeting error:', error);
    return fail(res, 500, 'Toplantı iptal edilemedi.');
  }
}

/* PATCH /api/meetings/:id { internalNote } */
export async function updateMeetingNote(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Toplantı bulunamadı.');
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return fail(res, 404, 'Toplantı bulunamadı.');
    meeting.internalNote = str(req.body?.internalNote, 2000);
    await meeting.save();
    return res.json({ success: true, data: meeting });
  } catch (error) {
    console.error('Meeting note error:', error);
    return fail(res, 500, 'Not kaydedilemedi.');
  }
}

/* DELETE /api/meetings/:id (admin role) */
export async function deleteMeeting(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Toplantı bulunamadı.');
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return fail(res, 404, 'Toplantı bulunamadı.');
    if (meeting.status === 'confirmed' && meeting.teams?.eventId) {
      await cancelTeamsMeeting(meeting.teams.eventId, '').catch((error) => console.error('Teams cancel error:', error.message));
    }
    await meeting.deleteOne();
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete meeting error:', error);
    return fail(res, 500, 'Toplantı silinemedi.');
  }
}

/* ---------- After the meeting ---------- */

// A meeting has been held once it is confirmed and its start has passed
export const isHeld = (meeting, now = new Date()) => meeting.status === 'confirmed' && new Date(meeting.startAt).getTime() <= now.getTime();

const OUTCOME_TEXT = { quote: 'Teklif hazırlanacak', followUp: 'Takip edilecek', noDeal: 'Şimdilik iş yok' };

/* POST /api/meetings/:id/result { outcome, note } */
export async function saveMeetingResult(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Toplantı bulunamadı.');
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return fail(res, 404, 'Toplantı bulunamadı.');
    if (meeting.status !== 'confirmed') return fail(res, 409, 'Sonuç yalnızca onaylanmış toplantıya girilebilir.');

    const outcome = MEETING_OUTCOMES.includes(req.body?.outcome) ? req.body.outcome : '';
    meeting.result = {
      outcome: meeting.quoteId ? 'quote' : outcome,
      note: str(req.body?.note, 3000),
      recordedAt: new Date(),
      recordedBy: req.admin?.name || req.admin?.email || '',
    };
    await meeting.save();
    return res.json({ success: true, data: meeting });
  } catch (error) {
    console.error('Meeting result error:', error);
    return fail(res, 500, 'Görüşme sonucu kaydedilemedi.');
  }
}

/*
  POST /api/meetings/:id/quote { product, quantity, note, followUpAt }
  Turns a held meeting into a quote request: the customer's details, the
  subject, the meeting notes and the attending staff member as owner. The
  customer is not e-mailed (the proforma is sent from the quote as usual).
  A meeting gives one quote request; asking again returns the existing one.
*/
export async function convertMeetingToQuote(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Toplantı bulunamadı.');
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return fail(res, 404, 'Toplantı bulunamadı.');
    if (meeting.status !== 'confirmed') return fail(res, 409, 'Yalnızca onaylanmış toplantı teklife dönüştürülebilir.');

    if (meeting.quoteId && (await QuoteRequest.exists({ _id: meeting.quoteId }))) {
      return res.status(409).json({ success: false, message: 'Bu toplantıdan zaten bir teklif talebi oluşturuldu.', quoteId: meeting.quoteId });
    }

    const body = req.body || {};
    const note = str(body.note, 3000) || meeting.result?.note || '';
    const product = str(body.product, 150) || [MEETING_TOPIC_LABELS[meeting.topic], meeting.subject].filter(Boolean).join(' – ').slice(0, 150);
    const quantity = Number.parseInt(body.quantity, 10);
    const followUp = typeof body.followUpAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.followUpAt) ? new Date(`${body.followUpAt}T12:00:00+03:00`) : null;
    const who = req.admin?.name || req.admin?.email || '';
    const reference = meetingReference(meeting._id);
    const when = formatWhen(meeting.startAt);

    const quote = await QuoteRequest.create({
      company: meeting.company,
      name: meeting.name,
      email: meeting.email,
      phone: meeting.phone,
      country: meeting.country,
      language: meeting.language,
      product,
      quantity: Number.isInteger(quantity) && quantity > 0 ? Math.min(quantity, 10000000) : null,
      message: [`${meeting.type === 'online' ? 'Online toplantı' : 'Yüz yüze görüşme'} (${reference}, ${when}) sonrası oluşturuldu.`, note].filter(Boolean).join('\n\n').slice(0, 5000),
      source: 'meeting',
      meetingId: meeting._id,
      status: 'reviewing',
      isRead: true,
      assignee: (meeting.staff?.[0]?.name || who).slice(0, 80),
      followUpAt: followUp && !Number.isNaN(followUp.getTime()) ? followUp : null,
      attribution: meeting.attribution?.channel ? meeting.attribution : undefined,
      notes: [{ text: `Toplantıdan oluşturuldu: ${reference} · ${when} · RMA: ${(meeting.staff || []).map((person) => person.name).join(', ') || '—'}`.slice(0, 2000), author: who }],
    });

    meeting.quoteId = quote._id;
    meeting.result = { outcome: 'quote', note, recordedAt: new Date(), recordedBy: who };
    await meeting.save();

    return res.status(201).json({ success: true, data: meeting, quoteId: quote._id });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) return fail(res, 400, Object.values(error.errors)[0]?.message || 'Lütfen alanları kontrol edin.');
    console.error('Meeting to quote error:', error);
    return fail(res, 500, 'Teklif talebi oluşturulamadı.');
  }
}

export const meetingOutcomeText = (outcome) => OUTCOME_TEXT[outcome] || '';

/* "Online · 12 Kasım 2026 Perşembe 14:00" for the activity log */
export const meetingLogLine = (meeting) =>
  meeting ? `${meeting.type === 'online' ? 'Online' : 'Yüz yüze'} · ${formatWhen(meeting.startAt)}` : '';

export { MEETING_STATUSES };
