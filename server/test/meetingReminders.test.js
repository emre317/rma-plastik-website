import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

delete process.env.SMTP_HOST;
delete process.env.MEETING_REMINDER_HOURS;
delete process.env.MEETING_REMINDERS;

const { default: Meeting } = await import('../models/Meeting.js');
const meetings = memoryModel(Meeting);
const { isReminderDue, reminderDueAt, sendDueReminders } = await import('../services/meetingReminders.js');
const { buildCustomerMeetingEmail, buildStaffMeetingEmail } = await import('../services/meetingEmail.js');

const now = new Date('2026-11-09T09:00:00Z');
const hours = (h) => new Date(now.getTime() + h * 3600 * 1000);

const make = (data = {}) => Meeting.create({
  type: 'online', company: 'Akdeniz Gıda', name: 'Ali', email: 'ali@example.com', topic: 'quote', language: 'tr',
  requestedStartAt: hours(20), startAt: hours(20), durationMinutes: 60, status: 'confirmed',
  staff: [{ name: 'Elif', email: 'elif@rmaplastik.com' }], joinUrl: 'https://teams.microsoft.com/l/meetup-join/x',
  mail: { customer: { status: 'sent', at: hours(-30) } },
  ...data,
});

test('due: confirmed, within 24 hours, not reminded for this start, invitation not just sent', async () => {
  meetings.reset();
  assert.equal(isReminderDue(await make(), now), true);
  assert.equal(isReminderDue(await make({ startAt: hours(30) }), now), false);
  assert.equal(isReminderDue(await make({ startAt: hours(0.2) }), now), false);
  assert.equal(isReminderDue(await make({ status: 'pending' }), now), false);
  assert.equal(isReminderDue(await make({ mail: { customer: { status: 'sent', at: hours(-2) } } }), now), false);
  const start = hours(20);
  assert.equal(isReminderDue(await make({ startAt: start, reminder: { forStart: start, sentAt: hours(-1) } }), now), false);
  // Moved to another time after the reminder: due again
  assert.equal(isReminderDue(await make({ startAt: hours(22), reminder: { forStart: hours(5), sentAt: hours(-1) } }), now), true);
  assert.equal(reminderDueAt({ startAt: hours(30) }).toISOString(), hours(6).toISOString());
});

test('sendDueReminders sends once per start time and records the mail', async () => {
  meetings.reset();
  const due = await make();
  await make({ startAt: hours(40) });
  await make({ status: 'cancelled' });

  assert.equal(await sendDueReminders(now), 1);
  assert.equal(due.reminder.forStart.getTime(), due.startAt.getTime());
  // No SMTP in tests: recorded as skipped
  assert.equal(due.mail.reminder.status, 'skipped');

  // A second run (another process, cron) does nothing
  assert.equal(await sendDueReminders(new Date(now.getTime() + 15 * 60000)), 0);
});

test('MEETING_REMINDERS=false turns it off', async () => {
  meetings.reset();
  await make();
  process.env.MEETING_REMINDERS = 'false';
  assert.equal(await sendDueReminders(now), 0);
  delete process.env.MEETING_REMINDERS;
});

test('reminder e-mails: customer in the site language with the link, staff in Turkish', async () => {
  const meeting = await make({ language: 'en', guests: [{ name: 'Sara', email: 'sara@example.com' }] });
  const customer = buildCustomerMeetingEmail(meeting, 'reminder');
  assert.match(customer.subject, /^Reminder: your meeting is coming up – TPL-/);
  assert.ok(customer.html.includes('https://teams.microsoft.com/l/meetup-join/x'));
  assert.ok(customer.html.includes('Elif'));
  const staff = buildStaffMeetingEmail(meeting, 'reminder');
  assert.match(staff.subject, /^Hatırlatma: toplantı yaklaşıyor: Akdeniz Gıda/);
  assert.ok(staff.html.includes('otomatik gönderilmiştir'));

  const ar = buildCustomerMeetingEmail({ ...meeting.toObject(), language: 'ar', type: 'inPerson', location: 'RMA Plastik, Mersin' }, 'reminder');
  assert.match(ar.subject, /^تذكير/);
  assert.ok(ar.html.includes('google.com/maps'));
});
