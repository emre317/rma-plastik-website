import Meeting from '../models/Meeting.js';
import MeetingBlock from '../models/MeetingBlock.js';
import { getBusyTimes, isTeamsConfigured, teamsOrganizer } from './teams.js';
import {
  MEETING_DEFAULT_DURATION, MEETING_MAX_DAYS_AHEAD, istanbulDateTime, meetingDays, meetingSlots,
} from '../../client/src/data/meetingForm.js';

/*
  Which website slots are taken. A slot (its start + MEETING_DEFAULT_DURATION)
  is closed when it overlaps
    - a time closed in the panel (MeetingBlock),
    - MEETING_MAX_PARALLEL (default 1) or more confirmed meetings,
    - busy time in every calendar of MEETING_CALENDARS (Microsoft 365; default
      TEAMS_ORGANIZER) — i.e. nobody in that team is free.
  The visitor only sees "taken": never what or whose.
  Outlook answers are cached for 5 minutes; an Outlook error leaves those
  slots open (the panel still decides).
*/

const CACHE_MS = 5 * 60 * 1000;
let outlookCache = { key: '', at: 0, data: null };

export const maxParallel = () => {
  const value = Number.parseInt(process.env.MEETING_MAX_PARALLEL, 10);
  return Number.isInteger(value) && value >= 1 && value <= 20 ? value : 1;
};

/* Calendars checked on Microsoft 365 (empty without the Graph settings) */
export function meetingCalendars() {
  if (!isTeamsConfigured()) return [];
  const list = String(process.env.MEETING_CALENDARS || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  return list.length ? list : [teamsOrganizer()];
}

const overlaps = (start, end, item) => item.start < end && item.end > start;

async function outlookBusy(from, to) {
  const calendars = meetingCalendars();
  if (!calendars.length) return null;

  const key = `${calendars.join(',')}|${from.toISOString()}|${to.toISOString()}`;
  if (outlookCache.key === key && Date.now() - outlookCache.at < CACHE_MS) return outlookCache.data;

  try {
    const data = await getBusyTimes(calendars, from, to);
    outlookCache = { key, at: Date.now(), data };
    return data;
  } catch (error) {
    console.error('[meetings] Outlook availability:', error.message);
    return null;
  }
}

export function clearAvailabilityCache() {
  outlookCache = { key: '', at: 0, data: null };
}

/* Everything that makes time unavailable between from and to */
export async function busyTimes(from, to, { excludeId = null } = {}) {
  const [meetings, blocks, outlook] = await Promise.all([
    Meeting.find({ status: 'confirmed', startAt: { $gte: new Date(from.getTime() - 8 * 3600000), $lt: to } })
      .select('_id startAt durationMinutes')
      .lean(),
    MeetingBlock.find({ end: { $gt: from }, start: { $lt: to } }).select('start end note').lean(),
    outlookBusy(from, to),
  ]);

  return {
    meetings: meetings
      .filter((meeting) => !excludeId || String(meeting._id) !== String(excludeId))
      .map((meeting) => ({ start: new Date(meeting.startAt), end: new Date(new Date(meeting.startAt).getTime() + (meeting.durationMinutes || 60) * 60000) })),
    blocks: blocks.map((block) => ({ start: new Date(block.start), end: new Date(block.end), note: block.note })),
    outlook,
  };
}

export function isTaken(start, durationMinutes, busy) {
  const end = new Date(start.getTime() + durationMinutes * 60000);
  if (busy.blocks.some((item) => overlaps(start, end, item))) return true;
  if (busy.meetings.filter((item) => overlaps(start, end, item)).length >= maxParallel()) return true;
  if (busy.outlook) {
    const calendars = Object.values(busy.outlook);
    if (calendars.length && calendars.every((items) => items.some((item) => overlaps(start, end, item)))) return true;
  }
  return false;
}

/* { '2026-11-10': ['10:00', '10:30'], … } for the website calendar */
export async function takenSlots(now = new Date(), days = MEETING_MAX_DAYS_AHEAD) {
  const list = meetingDays(now, days);
  if (!list.length) return {};

  const from = istanbulDateTime(list[0], '00:00');
  const to = new Date(istanbulDateTime(list.at(-1), '23:59').getTime() + 60000);
  const busy = await busyTimes(from, to);
  const slots = meetingSlots();
  const taken = {};

  for (const day of list) {
    const closed = slots.filter((slot) => isTaken(istanbulDateTime(day, slot), MEETING_DEFAULT_DURATION, busy));
    if (closed.length) taken[day] = closed;
  }

  return taken;
}

/* Is this start still free? (website submit) */
export async function isSlotFree(start) {
  const busy = await busyTimes(new Date(start.getTime() - 86400000), new Date(start.getTime() + 86400000));
  return !isTaken(start, MEETING_DEFAULT_DURATION, busy);
}

/*
  Panel check before confirming: other confirmed meetings at that time,
  closed times, and which of the chosen staff are busy in Outlook.
*/
export async function confirmConflicts({ start, durationMinutes, staffEmails = [], excludeId }) {
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const [meetings, blocks] = await Promise.all([
    Meeting.find({ status: 'confirmed', startAt: { $gte: new Date(start.getTime() - 8 * 3600000), $lt: end } })
      .select('_id company type startAt durationMinutes staff')
      .lean(),
    MeetingBlock.find({ end: { $gt: start }, start: { $lt: end } }).select('start end note').lean(),
  ]);

  let busyStaff = [];
  if (isTeamsConfigured() && staffEmails.length) {
    try {
      const outlook = await getBusyTimes(staffEmails, new Date(start.getTime() - 3600000), new Date(end.getTime() + 3600000));
      busyStaff = Object.entries(outlook).filter(([, items]) => items.some((item) => overlaps(start, end, item))).map(([email]) => email);
    } catch (error) {
      console.error('[meetings] Outlook conflict check:', error.message);
    }
  }

  return {
    meetings: meetings
      .filter((meeting) => String(meeting._id) !== String(excludeId))
      .filter((meeting) => overlaps(start, end, { start: new Date(meeting.startAt), end: new Date(new Date(meeting.startAt).getTime() + (meeting.durationMinutes || 60) * 60000) }))
      .map((meeting) => ({ _id: meeting._id, company: meeting.company, type: meeting.type, startAt: meeting.startAt, staff: (meeting.staff || []).map((person) => person.name) })),
    blocks: blocks.map((block) => ({ _id: block._id, start: block.start, end: block.end, note: block.note })),
    busyStaff,
  };
}
