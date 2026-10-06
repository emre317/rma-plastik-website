import 'dotenv/config';

import mongoose from 'mongoose';

import Product from '../models/Product.js';
import SiteSettings from '../models/SiteSettings.js';
import Post from '../models/Post.js';
import draftPosts from './seed-data/posts.js';

import builtInProducts from '../../client/src/data/products.builtin.js';
import tr from '../../client/src/i18n/locales/tr.js';
import en from '../../client/src/i18n/locales/en.js';
import ar from '../../client/src/i18n/locales/ar.js';

/*
  One-time import of the current site content into the database so the admin
  panel starts with everything the site shows today, plus draft blog posts.
  Existing records are kept.
    npm run seed-content
*/

const locales = { tr, en, ar };
const FIELDS = ['name', 'categoryLabel', 'capacity', 'material', 'application', 'technology', 'description'];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const count = await Product.countDocuments();

  if (count > 0) {
    console.log(`Products: ${count} already in the database, skipped.`);
  } else {
    const docs = builtInProducts.map((product, index) => ({
      slug: product.slug,
      category: product.category,
      quoteName: product.quoteName,
      featured: Boolean(product.featured),
      published: true,
      order: (index + 1) * 10,
      i18n: Object.fromEntries(
        Object.entries(locales).map(([lang, locale]) => [
          lang,
          Object.fromEntries(FIELDS.map((field) => [field, locale.catalog?.[product.slug]?.[field] || ''])),
        ])
      ),
    }));

    await Product.insertMany(docs);
    console.log(`Products: imported ${docs.length}.`);
  }

  const settings = await SiteSettings.findOne({ singleton: 'site' });

  if (settings?.email) {
    console.log('Settings: already filled, skipped.');
  } else {
    await SiteSettings.updateOne(
      { singleton: 'site' },
      {
        $set: {
          phoneDisplay: '+90 (324) 676 4500',
          phone: '+903246764500',
          email: 'info@rmaplastik.com',
          whatsapp: '905366700969',
          addressStreet: 'Nacarlı OSB, Cumhuriyet Cd. No: 22',
          addressDistrict: 'Akdeniz, Mersin',
          addressCountry: 'Türkiye',
          linkedin: 'https://www.linkedin.com/company/rmaplastik/',
          instagram: 'https://www.instagram.com/rmaplastik/',
          youtube: 'https://www.youtube.com/@rmaplastik5113',
          instagramHandle: '@rmaplastik',
          youtubeHandle: '@rmaplastik5113',
        },
      },
      { upsert: true }
    );
    console.log('Settings: imported current contact details.');
  }

  const postCount = await Post.countDocuments();

  if (postCount > 0) {
    console.log(`Blog: ${postCount} posts already in the database, skipped.`);
  } else {
    await Post.insertMany(
      draftPosts.map(({ slug, relatedProducts, tr }) => ({
        slug,
        relatedProducts,
        status: 'draft',
        i18n: { tr, en: {}, ar: {} },
      }))
    );
    console.log(`Blog: imported ${draftPosts.length} draft posts (review and publish them in the admin panel).`);
  }

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
