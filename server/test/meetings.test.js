import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

delete process.env.SMTP_HOST;
delete process.env.MS_GRAPH_TENANT_ID;
process.env.CLIENT_URL = 'https://www.rmaplastik.com';

const { default: Meeting } = await import('../models/Meeting.js');
const meetings = memoryModel(Meeting);

const { createMeeting, confirmMeeting, cancelMeeting, cleanGuests } = await import('../controllers/meetingController.js');
const { buildInvite, foldLine } = await import('../services/calendarInvite.js');
const { buildCustomerMeetingEmail, buildMeetingNotification, buildStaffMeetingEmail, notifyAddress } = await import('../services/meetingEmail.js');
const { istanbulDateTime, istanbulParts, isRequestableStart, meetingDays, meetingSlots } = await import('../../client/src/data/meetingForm.js');

const response = () => ({ code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });

// A working day at least a week ahead
const day = meetingDays().find((value) => new Date(`${value}T12:00:00+03:00`).getTime() > Date.now() + 7 * 86400000);
const nextDay = meetingDays().find((value) => value > day);

const base = {
  company: 'Akdeniz Gıda', name: 'Ali Veli', email: 'ali@example.com', phone: '+90 532 000 00 00', country: 'Türkiye',
  topic: 'product', subject: 'RD 5000 depolar', message: 'Fabrikanızı görmek istiyoruz.', date: day, time: '10:00', language: 'tr',
};

test('Türkiye time helpers', () => {
  const start = istanbulDateTime('2026-11-10', '14:00');
  assert.equal(start.toISOString(), '2026-11-10T11:00:00.000Z');
  assert.deepEqual(istanbulParts(start), { date: '2026-11-10', time: '14:00', weekday: 2 });
  assert.equal(istanbulDateTime('2026-02-31', '10:00'), null);
  assert.equal(istanbulDateTime('2026-11-10', '25:00'), null);
  assert.equal(meetingSlots()[0], '09:00');
  assert.equal(meetingSlots().at(-1), '17:00');
  // Weekends and times outside the slots are not offered
  assert.equal(isRequestableStart(istanbulDateTime('2026-11-14', '10:00'), new Date('2026-11-05T09:00:00Z')), false);
  assert.equal(isRequestableStart(istanbulDateTime('2026-11-10', '10:15'), new Date('2026-11-05T09:00:00Z')), false);
  assert.equal(isRequestableStart(istanbulDateTime('2026-11-10', '10:00'), new Date('2026-11-05T09:00:00Z')), true);
  assert.equal(isRequestableStart(istanbulDateTime('2026-11-05', '10:00'), new Date('2026-11-05T09:00:00Z')), false);
});

test('online guests are checked and de-duplicated', () => {
  assert.deepEqual(cleanGuests([{ name: 'A', email: 'A@x.com' }, { email: 'a@x.com' }, { email: 'ali@example.com' }, {}], 'ali@example.com').guests, [{ name: 'A', email: 'a@x.com' }]);
  assert.ok(cleanGuests([{ name: 'B', email: 'not-an-email' }]).error);
});

test('the website form needs a type, a subject, contact details and an open slot', async () => {
  for (const body of [
    { ...base, type: '' },
    { ...base, type: 'inPerson', topic: 'nope' },
    { ...base, type: 'inPerson', email: 'x' },
    { ...base, type: 'inPerson', phone: '12' },
    { ...base, type: 'inPerson', time: '22:00' },
    { ...base, type: 'inPerson', date: '2020-01-06' },
  ]) {
    const res = response();
    await createMeeting({ body }, res);
    assert.equal(res.code, 400, JSON.stringify(body));
  }
  assert.equal(meetings.store.length, 0);
});

test('a face-to-face request is saved as pending (no SMTP needed)', async () => {
  const res = response();
  await createMeeting({ body: { ...base, type: 'inPerson', guests: [{ name: 'X', email: 'x@example.com' }] } }, res);
  assert.equal(res.code, 201);
  assert.match(res.body.reference, /^TPL-[0-9A-F]{6}$/);
  const saved = meetings.store[0];
  assert.equal(saved.status, 'pending');
  assert.equal(saved.type, 'inPerson');
  // Guests only for online meetings
  assert.equal(saved.guests.length, 0);
  assert.equal(istanbulParts(saved.requestedStartAt).time, '10:00');
});

test('confirming a face-to-face meeting needs staff and a place; a new time is kept', async () => {
  const meeting = meetings.store[0];
  const req = (body) => ({ params: { id: String(meeting._id) }, body, admin: { _id: null, name: 'Ayşe' } });

  let res = response();
  await confirmMeeting(req({ date: day, time: '11:00', staff: [], location: 'Fabrika' }), res);
  assert.equal(res.code, 400);

  res = response();
  await confirmMeeting(req({ date: day, time: '11:00', staff: [{ name: 'Mehmet', email: 'mehmet@rmaplastik.com' }], location: '' }), res);
  assert.equal(res.code, 400);

  res = response();
  await confirmMeeting(req({ date: nextDay, time: '11:30', durationMinutes: 45, staff: [{ name: 'Mehmet Yılmaz', email: 'Mehmet@rmaplastik.com', title: 'Satış Müdürü' }], location: 'RMA Plastik, Nacarlı OSB, Mersin', customerNote: 'Kapıda güvenliğe adınızı söyleyin.' }), res);
  assert.equal(res.code, 200, res.body?.message);
  assert.equal(res.body.updated, false);
  assert.equal(meeting.status, 'confirmed');
  assert.equal(meeting.durationMinutes, 45);
  assert.equal(meeting.staff[0].email, 'mehmet@rmaplastik.com');
  assert.deepEqual(istanbulParts(meeting.startAt), { ...istanbulParts(meeting.startAt), date: nextDay, time: '11:30' });
  assert.notEqual(meeting.startAt.getTime(), meeting.requestedStartAt.getTime());
  assert.equal(meeting.sequence, 0);
  // Without SMTP the mails are recorded as skipped
  assert.equal(res.body.mail.customer.status, 'skipped');

  // A second save is an update: the calendar sequence goes up
  res = response();
  await confirmMeeting(req({ date: nextDay, time: '12:00', durationMinutes: 60, staff: [{ name: 'Mehmet Yılmaz', email: 'mehmet@rmaplastik.com' }], location: 'RMA Plastik, Nacarlı OSB, Mersin' }), res);
  assert.equal(res.body.updated, true);
  assert.equal(meeting.sequence, 1);
});

test('an online meeting needs a Teams link when Microsoft Graph is not set up', async () => {
  meetings.reset();
  let res = response();
  await createMeeting({ body: { ...base, type: 'online', guests: [{ name: 'Can', email: 'can@example.com' }] } }, res);
  assert.equal(res.code, 201);
  const meeting = meetings.store[0];
  assert.deepEqual(meeting.guests.map((guest) => guest.email), ['can@example.com']);

  const req = (body) => ({ params: { id: String(meeting._id) }, body, admin: { name: 'Ayşe' } });
  const staff = [{ name: 'Elif', email: 'elif@rmaplastik.com' }, { name: 'Elif 2', email: 'ELIF@rmaplastik.com' }];

  res = response();
  await confirmMeeting(req({ date: day, time: '10:00', staff, useTeams: true }), res);
  assert.equal(res.code, 400);

  res = response();
  await confirmMeeting(req({ date: day, time: '10:00', staff, joinUrl: 'javascript:alert(1)' }), res);
  assert.equal(res.code, 400);

  res = response();
  await confirmMeeting(req({ date: day, time: '10:00', staff, joinUrl: 'https://teams.microsoft.com/l/meetup-join/abc' }), res);
  assert.equal(res.code, 200, res.body?.message);
  assert.equal(meeting.joinUrl, 'https://teams.microsoft.com/l/meetup-join/abc');
  assert.equal(meeting.staff.length, 1);
});

test('cancelling: a pending request is declined, a confirmed meeting is cancelled', async () => {
  const meeting = meetings.store[0];
  let res = response();
  await cancelMeeting({ params: { id: String(meeting._id) }, body: { customerNote: 'Bayram tatili' }, admin: { name: 'Ayşe' } }, res);
  assert.equal(res.code, 200);
  assert.equal(meeting.status, 'cancelled');
  assert.equal(meeting.customerNote, 'Bayram tatili');

  res = response();
  await cancelMeeting({ params: { id: String(meeting._id) }, body: {}, admin: {} }, res);
  assert.equal(res.code, 409);

  res = response();
  await confirmMeeting({ params: { id: String(meeting._id) }, body: { date: day, time: '10:00' }, admin: {} }, res);
  assert.equal(res.code, 409);
});

test('calendar invitation: UTC times, attendees, escaping and folding', () => {
  const ics = buildInvite({
    uid: 'meeting-1@rmaplastik.com',
    sequence: 2,
    start: new Date('2026-11-10T11:00:00Z'),
    durationMinutes: 45,
    summary: 'RMA Plastik – Akdeniz; Gıda, A.Ş.',
    description: 'Satır 1\nSatır 2',
    location: 'Nacarlı OSB, Mersin',
    organizer: { name: 'RMA Plastik', email: 'web@rmaplastik.com' },
    attendees: [{ name: 'Ali "Veli"', email: 'ali@example.com' }],
    now: new Date('2026-11-05T09:00:00Z'),
  });
  assert.match(ics, /METHOD:REQUEST\r\n/);
  assert.match(ics, /DTSTART:20261110T110000Z\r\n/);
  assert.match(ics, /DTEND:20261110T114500Z\r\n/);
  assert.match(ics, /SEQUENCE:2\r\n/);
  assert.match(ics, /SUMMARY:RMA Plastik – Akdeniz\\; Gıda\\, A\.Ş\.\r\n/);
  assert.match(ics, /DESCRIPTION:Satır 1\\nSatır 2/);
  // Long lines continue after CRLF + space
  assert.ok(ics.replace(/\r\n /g, '').includes('ATTENDEE;CN="Ali Veli";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:ali@example.com'));
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, line);

  const cancel = buildInvite({ method: 'CANCEL', uid: 'x', start: new Date(), summary: 'x', organizer: { email: 'a@b.c' } });
  assert.match(cancel, /METHOD:CANCEL/);
  assert.match(cancel, /STATUS:CANCELLED/);
  assert.ok(!cancel.includes('VALARM'));

  assert.equal(foldLine('ş'.repeat(50)).split('\r\n ').every((part) => Buffer.byteLength(part) <= 75), true);
});

test('e-mails: info@ notification, customer mail in the site language, staff mail', () => {
  assert.equal(notifyAddress(), process.env.MEETING_NOTIFY_TO || process.env.QUOTE_NOTIFY_TO || 'info@rmaplastik.com');

  const meeting = new Meeting({
    type: 'online', company: 'Gulf <Trading>', name: 'Omar', email: 'omar@example.com', phone: '+971 50 000 0000', topic: 'quote',
    subject: 'AdBlue', message: 'Hello', guests: [{ name: 'Sara', email: 'sara@example.com' }], language: 'ar',
    requestedStartAt: new Date('2026-11-10T11:00:00Z'), startAt: new Date('2026-11-11T08:00:00Z'), durationMinutes: 30,
    staff: [{ name: 'Elif Kaya', email: 'elif@rmaplastik.com', title: 'İhracat' }], joinUrl: 'https://teams.microsoft.com/l/meetup-join/abc',
  });

  const notification = buildMeetingNotification(meeting);
  assert.match(notification.subject, /^Yeni toplantı talebi \(Online/);
  assert.ok(notification.html.includes('Gulf &lt;Trading&gt;'));
  assert.ok(!notification.html.includes('<Trading>'));
  assert.ok(notification.html.includes('https://www.rmaplastik.com/admin/meetings/'));

  const confirmed = buildCustomerMeetingEmail(meeting, 'confirmed');
  assert.match(confirmed.html, /dir="rtl"/);
  assert.ok(confirmed.html.includes('https://teams.microsoft.com/l/meetup-join/abc'));
  assert.ok(confirmed.html.includes('Elif Kaya'));
  assert.ok(confirmed.subject.includes('TPL-'));

  const receipt = buildCustomerMeetingEmail({ ...meeting.toObject(), language: 'en' }, 'receipt');
  assert.match(receipt.subject, /^We have received your meeting request/);
  // No link or staff before the meeting is confirmed
  assert.ok(!receipt.html.includes('teams.microsoft.com'));

  const staff = buildStaffMeetingEmail(meeting, 'confirmed');
  assert.match(staff.subject, /^Toplantıya katılımcı olarak eklendiniz/);
  assert.ok(staff.text.includes('sara@example.com'));
});
