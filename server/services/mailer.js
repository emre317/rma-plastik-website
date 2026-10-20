import nodemailer from 'nodemailer';
import { fileURLToPath } from 'node:url';

/*
  SMTP transport built from environment variables.
  When SMTP is not configured, emails are skipped (requests are still saved).
*/

let transporter = null;

export function isMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Port 465 uses implicit TLS; 587 must upgrade with STARTTLS (never plain text)
      secure,
      requireTLS: !secure,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

/* Checks the SMTP connection and login without sending anything */
export async function verifyMail() {
  if (!isMailConfigured()) throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASS must be set.');
  return getTransporter().verify();
}

const DEFAULT_SENDER_NAME = 'RMA Plastik';

/*
  The From header as { name, address }. MAIL_FROM may arrive as
  "RMA Plastik" <web@rmaplastik.com>, without quotes, with quotes escaped by
  the hosting panel, only a name, or only an address; the address falls back
  to SMTP_USER and the name to "RMA Plastik", so the sender name never gets lost.
*/
export function mailFrom() {
  const raw = String(process.env.MAIL_FROM || '').replace(/\\/g, '').trim();
  const found = raw.match(/[^\s<>"',;]+@[^\s<>"',;]+/);
  const address = found ? found[0] : String(process.env.SMTP_USER || '').trim();
  const name = (found ? raw.replace(found[0], '') : raw).replace(/[<>"']/g, '').replace(/\s+/g, ' ').trim();

  return { name: name || DEFAULT_SENDER_NAME, address };
}

/*
  Logo in the e-mail headers: the white wordmark for the dark header band,
  embedded in the message (cid:) so it shows even where remote images are
  blocked. sendMail() attaches it to every message whose HTML uses it.
*/
const LOGO_CID = 'rma-logo@rmaplastik.com';
const LOGO_PATH = fileURLToPath(new URL('../assets/email-logo.png', import.meta.url));

export function emailLogo() {
  return `<img src="cid:${LOGO_CID}" alt="RMA Plastik" width="160" height="58" style="display:inline-block;width:160px;height:58px;border:0;outline:none;text-decoration:none;color:#ffffff;font-size:20px;font-weight:700;">`;
}

export async function sendMail(message) {
  if (!isMailConfigured()) {
    console.warn('SMTP is not configured; email skipped:', message.subject);
    return null;
  }

  return getTransporter().sendMail(prepareMessage(message));
}

/* Sender and, when the HTML shows the logo, the embedded logo file */
export function prepareMessage(message) {
  const usesLogo = typeof message.html === 'string' && message.html.includes(`cid:${LOGO_CID}`);

  return {
    from: mailFrom(),
    ...message,
    attachments: [
      ...(message.attachments || []),
      ...(usesLogo ? [{ filename: 'rma-plastik.png', path: LOGO_PATH, cid: LOGO_CID, contentDisposition: 'inline' }] : []),
    ],
  };
}
