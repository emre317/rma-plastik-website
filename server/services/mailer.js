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

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Port 465 uses implicit TLS; 587 upgrades with STARTTLS
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === 'true'
        : port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

export async function sendMail(message) {
  if (!isMailConfigured()) {
    console.warn('SMTP is not configured; email skipped:', message.subject);
    return null;
  }

  return getTransporter().sendMail({
    from:
      process.env.MAIL_FROM ||
      `"RMA Plastik Web" <${process.env.SMTP_USER}>`,
    ...message,
  });
}
