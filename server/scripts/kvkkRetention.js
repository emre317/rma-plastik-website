/*
  KVKK automatic deletion (technical note D): creates the TTL indexes and
  gives records saved before this change a deletion date.
    npm run kvkk-retention              shows what would change (writes nothing)
    npm run kvkk-retention -- --apply   writes the changes
  Teklif talepleri: oluşturulma + 3 yıl · Katalog kayıtları: oluşturulma + 2 yıl
  (old catalogue consents were given with the previous text, so they do not
  keep a record beyond 2 years). Records already past that date are deleted by
  MongoDB within about a minute of --apply.
*/
import 'dotenv/config';
import mongoose from 'mongoose';

import AuditLog from '../models/AuditLog.js';
import ConsentRecord from '../models/ConsentRecord.js';
import Lead from '../models/Lead.js';
import QuoteRequest from '../models/QuoteRequest.js';
import Suppression from '../models/Suppression.js';
import { leadExpiry, quoteExpiry } from '../services/retention.js';

const apply = process.argv.includes('--apply');

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
console.log(`Veritabanı: ${mongoose.connection.name}\n${apply ? 'UYGULANIYOR' : 'DENEME (hiçbir şey yazılmıyor; yazmak için --apply)'}\n`);

const now = new Date();
const missing = { $or: [{ expireAt: { $exists: false } }, { expireAt: null }] };

const quotes = await QuoteRequest.find(missing).select('_id createdAt').lean();
const leads = await Lead.find(missing).select('_id createdAt marketingConsent').lean();
const quotePast = quotes.filter((doc) => quoteExpiry(doc.createdAt) <= now).length;
const leadPast = leads.filter((doc) => leadExpiry(doc.createdAt) <= now).length;

console.log(`Teklif talebi, silinme tarihi yok: ${quotes.length} (süresi dolmuş: ${quotePast})`);
console.log(`Katalog kaydı, silinme tarihi yok: ${leads.length} (süresi dolmuş: ${leadPast}; eski formda e-posta izni verilmiş: ${leads.filter((doc) => doc.marketingConsent).length})`);

if (apply) {
  for (const Model of [QuoteRequest, Lead, ConsentRecord, Suppression, AuditLog]) {
    await Model.createIndexes();
  }

  for (const doc of quotes) {
    await QuoteRequest.updateOne({ _id: doc._id }, { $set: { expireAt: quoteExpiry(doc.createdAt) } });
  }
  for (const doc of leads) {
    await Lead.updateOne({ _id: doc._id }, { $set: { expireAt: leadExpiry(doc.createdAt) } });
  }

  console.log('\nTTL indeksleri oluşturuldu ve silinme tarihleri yazıldı.');
}

await mongoose.disconnect();
