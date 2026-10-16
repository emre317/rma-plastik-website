import QuoteRequest from '../models/QuoteRequest.js';

/*
  Records whether an e-mail of a quote request went out, so a failed SMTP
  delivery is visible (and can be resent) in the admin panel. The request
  itself is always saved first; this never throws.
    kind: 'notification' (sales team) | 'confirmation' (customer)
*/
const clean = (message) =>
  String(message || 'Bilinmeyen hata')
    .replace(/(auth|pass(word)?)[^\s]*\s*[:=]\s*\S+/gi, '$1=***')
    .slice(0, 300);

export async function trackQuoteMail(quoteId, kind, send) {
  let entry;

  try {
    const result = await send();
    entry = { status: result ? 'sent' : 'skipped', at: new Date(), error: result ? '' : 'SMTP ya da alıcı adresi ayarlı değil.' };
  } catch (error) {
    console.error(`Quote ${kind} email error:`, error.message);
    entry = { status: 'failed', at: new Date(), error: clean(error.message) };
  }

  try {
    const quote = await QuoteRequest.findById(quoteId).select('mail').lean();
    const attempts = (quote?.mail?.[kind]?.attempts || 0) + 1;
    await QuoteRequest.updateOne({ _id: quoteId }, { $set: { [`mail.${kind}`]: { ...entry, attempts } } });
  } catch (error) {
    console.error(`Quote ${kind} email status could not be saved:`, error.message);
  }

  return entry;
}
