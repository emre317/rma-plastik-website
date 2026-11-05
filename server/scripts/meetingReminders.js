// Sends the meeting reminders that are due (services/meetingReminders.js).
// The API does the same every 15 minutes while it runs; on shared hosting
// Passenger may stop an idle app, so a cPanel cron makes it reliable
// (every 15 minutes; full line in docs/meetings.md):
//   cd ~/rma-app/server && . ~/nodevenv/rma-app/server/22/bin/activate && npm run meeting-reminders
import 'dotenv/config';
import mongoose from 'mongoose';

import { remindersEnabled, sendDueReminders } from '../services/meetingReminders.js';

if (!remindersEnabled()) {
  console.log('MEETING_REMINDERS=false: reminders are off.');
  process.exit(0);
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

try {
  const count = await sendDueReminders();
  console.log(`${new Date().toISOString()} meeting reminders sent: ${count}`);
} finally {
  await mongoose.disconnect();
}
