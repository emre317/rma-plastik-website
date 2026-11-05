import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

delete process.env.SMTP_HOST;
delete process.env.MS_GRAPH_TENANT_ID;
delete process.env.MEETING_MAX_PARALLEL;

const { default: Meeting } = await import('../models/Meeting.js');
const meetings = memoryModel(Meeting);
const { default: MeetingBlock } = await import('../models/MeetingBlock.js');
const blocks = memoryModel(MeetingBlock);
const { isTaken, takenSlots, confirmConflicts, meetingCalendars } = await import('../services/meetingAvailability.js');
const { createMeeting, createMeetingBlock } = await import('../controllers/meetingController.js');
const { istanbulDateTime, meetingDays } = await import('../../client/src/data/meetingForm.js');

const response = () => ({ code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, set() { return this; } });
const day = meetingDays().find((value) => new Date(`${value}T12:00:00+03:00`).getTime() > Date.now() + 7 * 86400000);
const at = (time) => istanbulDateTime(day, time);

const confirmed = (time, duration = 60) => Meeting.create({
  type: 'inPerson', status: 'confirmed', company: 'A', name: 'B', email: 'b@example.com', topic: 'product',
  requestedStartAt: at(time), startAt: at(time), durationMinutes: duration, staff: [{ name: 'M', email: 'm@rmaplastik.com' }], location: 'Fabrika',
});

test('a slot overlapping a confirmed meeting, a closed time or every busy calendar is taken', () => {
  const busy = { meetings: [{ start: at('10:00'), end: at('11:00') }], blocks: [], outlook: null };
  // 60-minute slots: 09:30 runs into 10:00, 11:00 starts when it ends
  assert.equal(isTaken(at('09:30'), 60, busy), true);
  assert.equal(isTaken(at('10:30'), 60, busy), true);
  assert.equal(isTaken(at('11:00'), 60, busy), false);
  assert.equal(isTaken(at('09:00'), 60, busy), false);

  // Two meetings can run side by side when allowed
  process.env.MEETING_MAX_PARALLEL = '2';
  assert.equal(isTaken(at('10:00'), 60, busy), false);
  delete process.env.MEETING_MAX_PARALLEL;

  assert.equal(isTaken(at('14:00'), 60, { meetings: [], blocks: [{ start: at('13:00'), end: at('17:00') }], outlook: null }), true);

  // Outlook: closed only when nobody is free
  const outlook = { 'a@x.com': [{ start: at('15:00'), end: at('16:00') }], 'b@x.com': [] };
  assert.equal(isTaken(at('15:00'), 60, { meetings: [], blocks: [], outlook }), false);
  outlook['b@x.com'].push({ start: at('14:30'), end: at('15:30') });
  assert.equal(isTaken(at('15:00'), 60, { meetings: [], blocks: [], outlook }), true);

  assert.deepEqual(meetingCalendars(), []);
});

test('the website gets the taken slots of each day, and a taken slot cannot be requested', async () => {
  meetings.reset();
  blocks.reset();
  await confirmed('14:00');

  const taken = await takenSlots();
  assert.deepEqual(taken[day], ['13:30', '14:00', '14:30']);

  const res = response();
  await createMeeting({ body: { type: 'online', company: 'C', name: 'D', email: 'd@example.com', phone: '+90 532 000 00 00', topic: 'quote', date: day, time: '14:00' } }, res);
  assert.equal(res.code, 409);
  assert.equal(res.body.code, 'taken');

  const ok = response();
  await createMeeting({ body: { type: 'online', company: 'C', name: 'D', email: 'd@example.com', phone: '+90 532 000 00 00', topic: 'quote', date: day, time: '15:00' } }, ok);
  assert.equal(ok.code, 201);
});

test('closed times from the panel close the whole day or a time range', async () => {
  meetings.reset();
  blocks.reset();
  const admin = { name: 'Ayşe' };

  let res = response();
  await createMeetingBlock({ body: { from: day, allDay: false, startTime: '09:00', endTime: '12:00', note: 'Denetim' }, admin }, res);
  assert.equal(res.code, 201);
  let taken = await takenSlots();
  assert.deepEqual(taken[day], ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);

  res = response();
  await createMeetingBlock({ body: { from: day, to: day, note: 'Bayram' }, admin }, res);
  taken = await takenSlots();
  assert.equal(taken[day].length, 17);

  for (const body of [{ from: day, allDay: false, startTime: '12:00', endTime: '10:00' }, { from: '2020-01-01' }, { from: 'x' }]) {
    const bad = response();
    await createMeetingBlock({ body, admin }, bad);
    assert.equal(bad.code, 400, JSON.stringify(body));
  }
});

test('the panel sees other meetings and closed times at the chosen time', async () => {
  meetings.reset();
  blocks.reset();
  const other = await confirmed('10:00', 90);
  const result = await confirmConflicts({ start: at('11:00'), durationMinutes: 60, staffEmails: ['m@rmaplastik.com'], excludeId: null });
  assert.equal(result.meetings.length, 1);
  assert.equal(String(result.meetings[0]._id), String(other._id));
  assert.deepEqual(result.busyStaff, []);

  const self = await confirmConflicts({ start: at('11:00'), durationMinutes: 60, excludeId: other._id });
  assert.equal(self.meetings.length, 0);
});
