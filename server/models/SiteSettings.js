import mongoose from 'mongoose';

const str = (maxlength = 300) => ({ type: String, trim: true, default: '', maxlength });

/* Single document with the company contact details shown on the site */
const siteSettingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'site', unique: true },

    phoneDisplay: str(40),
    phone: str(30),
    email: str(254),
    whatsapp: str(20),

    addressStreet: str(200),
    addressDistrict: str(120),
    addressCountry: str(80),

    linkedin: str(),
    instagram: str(),
    youtube: str(),
    instagramHandle: str(80),
    youtubeHandle: str(80),

    // Offer document (admin only, never published on the site)
    companyLegalName: str(200),
    taxInfo: str(160),
    offerBankInfo: str(800),
    offerTerms: str(3000),

    // Publishing bookkeeping
    contentChangedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

export async function getSiteSettings() {
  return (
    (await SiteSettings.findOne({ singleton: 'site' })) ||
    SiteSettings.create({ singleton: 'site' })
  );
}

export async function markContentChanged() {
  await SiteSettings.updateOne(
    { singleton: 'site' },
    { $set: { contentChangedAt: new Date() } },
    { upsert: true }
  );
}

export default SiteSettings;
