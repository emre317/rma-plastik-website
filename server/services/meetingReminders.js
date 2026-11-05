import Meeting from '../models/Meeting.js';
import { sendCustomerMeetingEmail, sendStaffMeetingEmail, trackMeetingMail } from './meetingEmail.js';

/*
  Reminder e-mail before a confirmed meeting: the customer (online guests in
  Cc) and the RMA staff, MEETING_REMINDER_HOURS (default 24) before the start.
    - Sent once per start time: a meeting moved to another time is reminded again.
    - Not sent when the invitation itself went out shortly before (less than
      MIN_GAP_HOURS ago): a meeting confirmed this morning for tomorrow gets
      its reminder later, one confirmed an hour before it starts gets none.
    - Not sent within the last LAST_CALL_MINUTES before the start.
  Runs every 15 minutes inside the API (server.js) and from
  `npm run meeting-reminders` (cPanel cron), whichever comes first; the
  meeting is claimed with one atomic update, so nobody gets it twice.
  MEETING_REMINDERS=false turns it off.
*/

const MIN_GAP_HOURS = 6;
const LAST_CALL_MINUTES = 30;
export const REMINDER_INTERVAL_MS = 15 * 60 * 1000;

export const remindersEnabled = () => process.env.MEETING_REMINDERS !== 'false';

export const reminderHours = () => {
  const hours = Number(process.env.MEETING_REMINDER_HOURS);
  return Number.isFinite(hours) && hours >= 1 && hours <= 168 ? hours : 24;
};

/* When the reminder of this meeting goes out (shown in the panel) */
export function reminderDueAt(meeting) {
  return new Date(new Date(meeting.startAt).getTime() - reminderHours() * 3600 * 1000);
}

/* Is this meeting due for a reminder right now? */
export function isReminderDue(meeting, now = new Date()) {
  if (meeting.status !== 'confirmed') return false;
  const start = new Date(meeting.startAt).getTime();
  const left = start - now.getTime();
  if (left > reminderHours() * 3600 * 1000 || left < LAST_CALL_MINUTES * 60000) return false;

  // Already reminded for this start time
  if (meeting.reminder?.forStart && new Date(meeting.reminder.forStart).getTime() === start) return false;

  // The confirmation / update e-mail went out only a short while ago
  const lastInvite = meeting.mail?.customer?.at ? new Date(meeting.mail.customer.at).getTime() : 0;
  if (lastInvite && now.getTime() - lastInvite < MIN_GAP_HOURS * 3600 * 1000) return false;

  return true;
}

/* Sends the reminders that are due; returns how many meetings were reminded */
export async function sendDueReminders(now = new Date()) {
  if (!remindersEnabled()) return 0;

  const candidates = await Meeting.find({
    status: 'confirmed',
    startAt: { $gte: new Date(now.getTime() + LAST_CALL_MINUTES * 60000), $lte: new Date(now.getTime() + reminderHours() * 3600 * 1000) },
  }).limit(50);

  let sent = 0;

  for (const meeting of candidates) {
    if (!isReminderDue(meeting, now)) continue;

    // Claim it: only the run that changes `forStart` sends the e-mails
    const claimed = await Meeting.findOneAndUpdate(
      { _id: meeting._id, status: 'confirmed', startAt: meeting.startAt, 'reminder.forStart': { $ne: meeting.startAt } },
      { $set: { 'reminder.forStart': meeting.startAt, 'reminder.sentAt': now } },
      { returnDocument: 'after' }
    );
    if (!claimed) continue;

    await trackMeetingMail(claimed._id, 'reminder', async () => {
      const [customer] = await Promise.all([
        sendCustomerMeetingEmail(claimed, 'reminder'),
        sendStaffMeetingEmail(claimed, 'reminder').catch((error) => {
          console.error('Meeting staff reminder error:', error.message);
          return null;
        }),
      ]);
      return customer;
    });
    sent += 1;
  }

  return sent;
}

/* Inside the API process: a run every 15 minutes (never blocks shutdown) */
export function startReminderTimer(isReady = () => true) {
  if (!remindersEnabled()) return null;

  const run = () => {
    if (!isReady()) return;
    sendDueReminders()
      .then((count) => count && console.log(`[meetings] ${count} reminder(s) sent`))
      .catch((error) => console.error('[meetings] reminders:', error.message));
  };

  const first = setTimeout(run, 60 * 1000);
  first.unref();
  const timer = setInterval(run, REMINDER_INTERVAL_MS);
  timer.unref();
  return timer;
}
