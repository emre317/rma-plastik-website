/*
  Puts the measurements from the price list into the product tables saved in
  the database, removes the models taken off the site and adds the new
  models, tables and product groups (the site's built-in data already has
  all of this).
    npm run sync-dimensions              shows what would change (writes nothing)
    npm run sync-dimensions -- --apply   writes the changes
  Afterwards publish the site from the panel (Yayınla).
*/
import 'dotenv/config';
import fs from 'node:fs';
import mongoose from 'mongoose';

import { syncAdditions, syncDimensions } from '../services/dimensionSync.js';

const apply = process.argv.includes('--apply');
const file = new URL('./data/product-dimensions-2026-09.json', import.meta.url);
const { changes, removals = [], additions = {}, source } = JSON.parse(fs.readFileSync(file, 'utf8'));

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
console.log(`Kaynak: ${source}\nVeritabanı: ${mongoose.connection.name}\n${apply ? 'UYGULANIYOR' : 'DENEME (hiçbir şey yazılmıyor; yazmak için --apply)'}\n`);

const report = await syncDimensions(changes, { apply, removals });
const added = await syncAdditions(additions, { apply });

const section = (title, list) => list.length && console.log(`${title} (${list.length})\n  ${list.join('\n  ')}\n`);
section(apply ? 'Güncellendi' : 'Güncellenecek', report.updated);
section(apply ? 'Kaldırıldı' : 'Kaldırılacak', report.removed);
section('Panelde değiştirilmiş, dokunulmadı', report.edited);
section('Satır bulunamadı', report.missingRow);
section('Ürün ailesi veritabanında yok (site yerleşik tabloyu kullanıyor)', report.missingFamily);
section(apply ? 'Eklenen ürün tabloları' : 'Eklenecek ürün tabloları', added.families);
section(apply ? 'Eklenen modeller' : 'Eklenecek modeller', added.rows);
section(apply ? 'Eklenen ürün grupları' : 'Eklenecek ürün grupları', added.groups);
section(apply ? 'Güncellenen ürün grupları' : 'Güncellenecek ürün grupları', added.groupUpdates);
added.skipped.forEach((line) => console.log(line));
console.log(`Zaten güncel: ${report.already.length}`);
const addedAny = added.families.length || added.rows.length || added.groups.length || added.groupUpdates.length;
if (apply && (report.updated.length || report.removed.length || addedAny)) console.log('\nPanelden "Yayınla" ile siteyi yayınlayın.');

await mongoose.disconnect();
