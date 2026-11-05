import 'dotenv/config';

import app from './app.js';
import { closeDatabase, connectDatabase, databaseState } from './config/db.js';
import { checkEnvironment } from './config/env.js';
import { recoverPublishJobs } from './services/publisher.js';
import { startReminderTimer } from './services/meetingReminders.js';


/* =====================================================
   ENVIRONMENT
===================================================== */

const { errors, warnings } = checkEnvironment();

warnings.forEach((message) => console.warn(`[env] ${message}`));

if (errors.length > 0) {
  errors.forEach((message) => console.error(`[env] ${message}`));
  process.exit(1);
}

// Passenger (cPanel "Setup Node.js App") passes its own port/socket here
const PORT = process.env.PORT || 5000;


/* =====================================================
   SERVER
   Listens at once; the database connects (and retries) in the background,
   /api/health reports its state meanwhile.
===================================================== */

const server = app.listen(PORT, () => {
  console.log(`RMA API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

connectDatabase({ wait: false });

// Publish jobs left running by a restart are checked against GitHub or closed
setTimeout(() => recoverPublishJobs().catch((error) => console.error('[publish] recovery:', error.message)), 15000).unref();

// Meeting reminders (24 h before by default); also `npm run meeting-reminders` from cron
startReminderTimer(() => databaseState() === 'connected');


/* =====================================================
   SHUTDOWN
===================================================== */

function shutdown(signal) {
  console.log(`${signal} received, closing.`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
