import 'dotenv/config';

import { sendMail, verifyMail } from '../services/mailer.js';

/*
  Checks the SMTP settings in server/.env:
    npm run mail-test                     -> connection and login only
    npm run mail-test -- ad@rmaplastik.com -> also sends a short test e-mail
*/
async function mailTest() {
  const to = process.argv[2];
  const port = Number(process.env.SMTP_PORT) || 465;

  console.log(`SMTP: ${process.env.SMTP_HOST || '(not set)'}:${port} as ${process.env.SMTP_USER || '(not set)'}`);

  try {
    await verifyMail();
    console.log('Connection and login OK.');

    if (to) {
      const info = await sendMail({
        to,
        subject: 'RMA Plastik web sitesi – SMTP testi',
        text: 'Bu e-posta web sitesinin SMTP ayarlarını denemek için gönderildi. Ayarlar çalışıyor.',
      });
      console.log(`Test e-mail sent to ${to} (${info?.messageId || 'no id'}).`);
    }

    process.exit(0);
  } catch (error) {
    console.error(`SMTP check failed: ${error.message}`);
    process.exit(1);
  }
}

mailTest();
