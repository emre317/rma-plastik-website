import nodemailer from 'nodemailer';

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

export async function sendMail(message) {
  if (!isMailConfigured()) {
    console.warn('SMTP is not configured; email skipped:', message.subject);
    return null;
  }

  return getTransporter().sendMail({
    from: mailFrom(),
    ...message,
  });
}
