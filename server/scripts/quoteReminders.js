// Sends the quote (proforma) reminders that are due (services/quoteReminders.js).
// The API does the same every hour while it runs; on shared hosting Passenger
// may stop an idle app, so a cPanel cron makes it reliable (every hour):
//   cd ~/rma-app/server && . ~/nodevenv/rma-app/server/22/bin/activate && npm run quote-reminders
import 'dotenv/config';
import mongoose from 'mongoose';

import { remindersEnabled, sendDueQuoteReminders } from '../services/quoteReminders.js';

if (!remindersEnabled()) {
  console.log('QUOTE_REMINDERS=false: reminders are off.');
  process.exit(0);
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

try {
  const count = await sendDueQuoteReminders();
  console.log(`${new Date().toISOString()} quote reminders sent: ${count}`);
} finally {
  await mongoose.disconnect();
}
