import QuoteRequest from '../models/QuoteRequest.js';
import { getSiteSettings } from '../models/SiteSettings.js';
import { isMailConfigured } from './mailer.js';
import { sendReminderEmail } from './quoteEmail.js';
import { loadOfferAttachments } from './offerFiles.js';

/*
  A single automatic reminder, QUOTE_REMINDER_DAYS (default 4) after a
  proforma was sent, while the quote is still open (no outcome, not closed)
  and nobody has reminded about it yet — sales can also send as many manual
  reminders as they like from the panel at any time
  (controllers/quoteController.js' remindQuoteOffer), and the automatic one
  stands down once any reminder, manual or automatic, has gone out.

  Runs every hour inside the API (server.js) and from `npm run quote-reminders`
  (cPanel cron), whichever comes first; the quote is claimed with one atomic
  update on `offer.autoReminderAt` (only the run that sets it sends the
  e-mail), so nobody gets it twice.
  QUOTE_REMINDERS=false turns it off.
*/

export const remindersEnabled = () => process.env.QUOTE_REMINDERS !== 'false';

export const reminderDays = () => {
  const days = Number(process.env.QUOTE_REMINDER_DAYS);
  return Number.isFinite(days) && days >= 1 && days <= 30 ? days : 4;
};

/* Is this quote due for its one automatic reminder right now? */
export function isQuoteReminderDue(quote, now = new Date()) {
  if (!quote.offer?.sentAt || quote.offer.autoReminderAt) return false;
  if (quote.outcome || quote.status === 'closed') return false;
  if ((quote.offer.reminders || []).length > 0) return false; // a manual one already went out

  const cutoffMs = now.getTime() - reminderDays() * 24 * 3600 * 1000;
  return new Date(quote.offer.sentAt).getTime() <= cutoffMs;
}

/* Sends the reminders that are due; returns how many quotes were reminded */
export async function sendDueQuoteReminders(now = new Date()) {
  if (!remindersEnabled() || !isMailConfigured()) return 0;

  const candidates = await QuoteRequest.find({
    outcome: { $in: ['', null] },
    status: { $ne: 'closed' },
    'offer.sentAt': { $ne: null },
    'offer.autoReminderAt': null,
  }).limit(200);

  let sent = 0;

  for (const quote of candidates) {
    if (!isQuoteReminderDue(quote, now)) continue;

    const attachments = loadOfferAttachments(quote._id);
    if (!attachments) continue; // nothing was saved for this offer (should not normally happen)

    // Claim it: only the run that sets autoReminderAt sends the e-mail
    // eslint-disable-next-line no-await-in-loop
    const claimed = await QuoteRequest.findOneAndUpdate(
      { _id: quote._id, 'offer.autoReminderAt': null },
      { $set: { 'offer.autoReminderAt': now } },
      { returnDocument: 'after' }
    );
    if (!claimed) continue;

    try {
      // eslint-disable-next-line no-await-in-loop
      const settings = await getSiteSettings().catch(() => ({}));
      // eslint-disable-next-line no-await-in-loop
      await sendReminderEmail(claimed, claimed.offer, settings || {}, attachments, claimed.offer.reminders.length);
      claimed.offer.reminders.push({ sentAt: now, kind: 'auto' });
      // eslint-disable-next-line no-await-in-loop
      await claimed.save();
      sent += 1;
    } catch (error) {
      console.error('Quote reminder error:', error.message);
    }
  }

  return sent;
}

const REMINDER_INTERVAL_MS = 60 * 60 * 1000; // a day-granularity reminder needs no finer polling

/* Inside the API process: a run every hour (never blocks shutdown) */
export function startQuoteReminderTimer(isReady = () => true) {
  if (!remindersEnabled()) return null;

  const run = () => {
    if (!isReady()) return;
    sendDueQuoteReminders()
      .then((count) => count && console.log(`[quotes] ${count} reminder(s) sent`))
      .catch((error) => console.error('[quotes] reminders:', error.message));
  };

  const first = setTimeout(run, 90 * 1000);
  first.unref();
  const timer = setInterval(run, REMINDER_INTERVAL_MS);
  timer.unref();
  return timer;
}
