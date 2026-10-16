/*
  Checks the API configuration on the hosting before (re)starting the app:
    npm run check-env                 environment variables only
    npm run check-env -- --db         + connects to MongoDB (Atlas)
    npm run check-env -- --smtp       + logs in to the SMTP server (sends nothing)
  Values are never printed, only whether they are set and valid.
*/
import 'dotenv/config';
import mongoose from 'mongoose';

import { checkEnvironment, publishMode } from '../config/env.js';
import { redactUri } from '../config/db.js';
import { isGithubConfigured } from '../services/githubActions.js';
import { verifyMail } from '../services/mailer.js';
import { UPLOAD_ROOT } from '../middleware/upload.js';

const args = process.argv.slice(2);
const { errors, warnings } = checkEnvironment();

console.log(`NODE_ENV:      ${process.env.NODE_ENV || '(not set)'}`);
console.log(`Node.js:       ${process.version}`);
console.log(`MongoDB:       ${process.env.MONGODB_URI ? redactUri(process.env.MONGODB_URI) : '(not set)'}`);
console.log(`CLIENT_URL:    ${process.env.CLIENT_URL || '(not set)'}`);
console.log(`Uploads:       ${UPLOAD_ROOT}`);
console.log(`Publish mode:  ${publishMode()}${publishMode() === 'github' ? (isGithubConfigured() ? ' (GitHub configured)' : ' (GitHub NOT configured)') : ''}`);
console.log(`TRUST_PROXY:   ${process.env.TRUST_PROXY || '(not set)'}`);
console.log('');

warnings.forEach((message) => console.log(`WARNING  ${message}`));
errors.forEach((message) => console.log(`ERROR    ${message}`));
if (!errors.length && !warnings.length) console.log('Environment OK.');

let failed = errors.length > 0;

if (args.includes('--db')) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\nMongoDB OK: ${mongoose.connection.name} (${collections.length} collections).`);
  } catch (error) {
    failed = true;
    console.log(`\nMongoDB FAILED: ${error.message}`);
    console.log('Check the Atlas Network Access list (the hosting server IP) and the user/password.');
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

if (args.includes('--smtp')) {
  try {
    await verifyMail();
    console.log('\nSMTP OK: connection and login succeeded.');
  } catch (error) {
    failed = true;
    console.log(`\nSMTP FAILED: ${error.message}`);
  }
}

process.exit(failed ? 1 : 0);
