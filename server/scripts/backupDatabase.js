/*
  Database backup without MongoDB tools (works on shared hosting):
  every collection is written as Extended JSON (types like ObjectId and Date
  are kept) into one gzip file per collection.

    npm run backup-db                       -> BACKUP_DIR/YYYY-MM-DD_HHMM/
    BACKUP_KEEP=14 npm run backup-db        keeps the newest 14 backups

  BACKUP_DIR defaults to ~/rma-backups/db. Restore on a computer with the
  MongoDB Database Tools (see docs/hosting-com-tr-deployment.md):
    gunzip -c quoterequests.json.gz | mongoimport --uri "<URI>" --collection quoterequests --jsonArray
  Run it from cPanel > Cron Jobs, e.g. every night:
    cd ~/rma-app/server && source <nodevenv>/bin/activate && npm run backup-db
*/
import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import mongoose from 'mongoose';

const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(os.homedir(), 'rma-backups', 'db'));
const KEEP = Number(process.env.BACKUP_KEEP) || 14;
const { EJSON } = mongoose.mongo.BSON;

const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
const target = path.join(BACKUP_DIR, stamp);

async function* asJsonArray(cursor) {
  yield '[\n';
  let first = true;
  for await (const doc of cursor) {
    yield `${first ? '' : ',\n'}${EJSON.stringify(doc, { relaxed: false })}`;
    first = false;
  }
  yield '\n]\n';
}

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  fs.mkdirSync(target, { recursive: true });

  const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
  const summary = {};

  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    const collection = mongoose.connection.db.collection(name);
    summary[name] = await collection.estimatedDocumentCount();
    await pipeline(Readable.from(asJsonArray(collection.find())), zlib.createGzip(), fs.createWriteStream(path.join(target, `${name}.json.gz`)));
  }

  fs.writeFileSync(path.join(target, 'manifest.json'), `${JSON.stringify({ createdAt: new Date(), database: mongoose.connection.name, collections: summary }, null, 2)}\n`);
  console.log(`Backup written to ${target} (${Object.keys(summary).length} collections).`);

  // Remove the oldest backups
  const all = fs.readdirSync(BACKUP_DIR).filter((name) => /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(name)).sort().reverse();
  all.slice(KEEP).forEach((name) => fs.rmSync(path.join(BACKUP_DIR, name), { recursive: true, force: true }));
} catch (error) {
  console.error(`Backup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
