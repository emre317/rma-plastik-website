/*
  Meeting request (Toplantı Talebi) settings, shared by the website form and
  the API (server/controllers/meetingController.js imports this file).
  Times are Türkiye time (Europe/Istanbul, UTC+3 all year, no summer time).
*/

export const MEETING_TYPES = ['inPerson', 'online'];

// Subjects offered as chips; the visitor can add a few words of their own
export const MEETING_TOPICS = ['product', 'quote', 'project', 'visit', 'partnership', 'other'];

// Turkish labels for the e-mails and the panel (site texts: i18n meeting.topics.*)
export const MEETING_TOPIC_LABELS = {
  product: 'Ürün bilgisi',
  quote: 'Teklif / fiyat görüşmesi',
  project: 'Özel üretim projesi',
  visit: 'Fabrika ziyareti',
  partnership: 'Bayilik / iş birliği',
  other: 'Diğer',
};

export const MEETING_TYPE_LABELS = {
  inPerson: 'Yüz yüze',
  online: 'Online (Microsoft Teams)',
};

// Working days offered in the calendar: 1 = Monday … 5 = Friday (0 = Sunday, 6 = Saturday)
export const MEETING_WEEKDAYS = [1, 2, 3, 4, 5];

// First and last start time offered, every 30 minutes
export const MEETING_FIRST_SLOT = '09:00';
export const MEETING_LAST_SLOT = '17:00';
export const MEETING_SLOT_MINUTES = 30;

// How far ahead a visitor may ask (days), and the earliest start from now (hours)
export const MEETING_MAX_DAYS_AHEAD = 90;
export const MEETING_MIN_HOURS_AHEAD = 2;

// Lengths the panel can choose when confirming (minutes)
export const MEETING_DURATIONS = [30, 45, 60, 90, 120];
export const MEETING_DEFAULT_DURATION = 60;

// Online meetings: other people from the visitor's side
export const MEETING_MAX_GUESTS = 10;

export const ISTANBUL_OFFSET = '+03:00';

const pad = (value) => String(value).padStart(2, '0');

/* "09:00", "09:30", … "17:00" */
export function meetingSlots(first = MEETING_FIRST_SLOT, last = MEETING_LAST_SLOT, step = MEETING_SLOT_MINUTES) {
  const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const slots = [];
  for (let minutes = toMinutes(first); minutes <= toMinutes(last); minutes += step) {
    slots.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  }
  return slots;
}

/* "2026-11-10" + "14:00" (Türkiye time) -> Date, or null */
export function istanbulDateTime(date, time) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const value = new Date(`${date}T${time}:00${ISTANBUL_OFFSET}`);
  // 2026-02-31 and the like
  if (Number.isNaN(value.getTime()) || istanbulParts(value).date !== date) return null;
  return value;
}

/* Date -> { date: "2026-11-10", time: "14:00", weekday: 2 } in Türkiye time */
export function istanbulParts(value) {
  const shifted = new Date(new Date(value).getTime() + 3 * 3600 * 1000);
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
    weekday: shifted.getUTCDay(),
  };
}

/* The days the website calendar offers, from today (Türkiye) on */
export function meetingDays(from = new Date(), count = MEETING_MAX_DAYS_AHEAD) {
  const today = istanbulParts(from).date;
  const start = new Date(`${today}T12:00:00${ISTANBUL_OFFSET}`);
  const days = [];
  for (let offset = 0; offset <= count; offset += 1) {
    const day = istanbulParts(new Date(start.getTime() + offset * 86400000));
    if (MEETING_WEEKDAYS.includes(day.weekday)) days.push(day.date);
  }
  return days;
}

/* Is this start time one the website may ask for? */
export function isRequestableStart(startAt, now = new Date()) {
  if (!(startAt instanceof Date) || Number.isNaN(startAt.getTime())) return false;
  const { weekday, time } = istanbulParts(startAt);
  if (!MEETING_WEEKDAYS.includes(weekday) || !meetingSlots().includes(time)) return false;
  const earliest = now.getTime() + MEETING_MIN_HOURS_AHEAD * 3600 * 1000;
  const latest = now.getTime() + (MEETING_MAX_DAYS_AHEAD + 1) * 86400000;
  return startAt.getTime() >= earliest && startAt.getTime() <= latest;
}
