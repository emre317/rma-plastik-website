import ProductFamily from '../models/ProductFamily.js';
import ProductGroup from '../models/ProductGroup.js';
import Sector from '../models/Sector.js';
import SiteSettings, { getSiteSettings, markContentChanged } from '../models/SiteSettings.js';

/*
  One-time changes to the catalogue saved in the admin panel, applied by the
  API itself once the database is connected (the site's built-in data already
  has them). Each one runs a single time: its id is kept in the site settings,
  so what is changed in the panel afterwards is never touched again.
*/

/*
  Rectangular tanks (Köşeli Tanklar) become a product group of their own
  instead of sitting inside another group: the group is added right after the
  horizontal tanks, the table and the sector products that show it move there
  and are called "Köşeli" instead of "Kare".
*/
// Earlier wording of the built-in sector texts -> the new one
const RENAMED = {
  product: {
    tr: ['Kare Tanklar', 'Köşeli Tanklar'],
    en: ['Square Tanks', 'Rectangular Tanks'],
    ar: ['خزانات مربعة', 'خزانات مستطيلة'],
  },
  description: {
    tr: ['dikey, yatay, kare ve çift katmanlı', 'dikey, yatay, köşeli ve çift katmanlı'],
    en: ['Vertical, horizontal, square and two-layer', 'Vertical, horizontal, rectangular and two-layer'],
    ar: ['عمودية وأفقية ومربعة وثنائية', 'عمودية وأفقية ومستطيلة وثنائية'],
  },
};

async function rectangularGroup() {
  const GROUP = 'rectangular';
  const FAMILY = 'rectangular-tanks';
  const done = [];

  // No groups saved yet: the site shows the built-in ones, which have the group
  if ((await ProductGroup.countDocuments()) > 0 && !(await ProductGroup.findOne({ groupId: GROUP }))) {
    const { builtInGroupDocs } = await import('../controllers/catalogueController.js');
    const doc = (await builtInGroupDocs()).find((item) => item.groupId === GROUP);
    const previous = await ProductGroup.findOne({ groupId: 'horizontal' });
    await ProductGroup.create({ ...doc, order: previous ? (previous.order || 0) + 1 : doc.order });
    done.push('group added');
  }

  const family = await ProductFamily.findOne({ familyId: FAMILY });
  if (family && family.group !== GROUP) {
    done.push(`table moved from "${family.group}"`);
    family.group = GROUP;
    await family.save();
  }

  for (const sector of await Sector.find()) {
    let dirty = false;

    for (const product of sector.products || []) {
      if (product.families?.length !== 1 || product.families[0] !== FAMILY) continue;
      if (product.group !== GROUP) {
        product.group = GROUP;
        dirty = true;
      }
      // "Kare" becomes "Köşeli"; a name written in the panel stays as it is
      for (const [lang, [from, to]] of Object.entries(RENAMED.product)) {
        if (product.i18n?.[lang]?.name !== from) continue;
        product.i18n[lang].name = to;
        dirty = true;
      }
    }

    for (const [lang, [from, to]] of Object.entries(RENAMED.description)) {
      const text = sector.i18n?.[lang]?.description || '';
      if (!text.includes(from)) continue;
      sector.i18n[lang].description = text.replace(from, to);
      dirty = true;
    }

    if (!dirty) continue;
    await sector.save();
    done.push(`sector "${sector.sectorId}" updated`);
  }

  return done;
}

/*
  Planters (Saksılar) get a model table: the built-in table is added to the
  saved ones and the group stops being "made to order" so its models show.
*/
async function plantersTable() {
  const FAMILY = 'planters';
  const done = [];

  // No tables saved yet: the site shows the built-in ones, which have it
  if ((await ProductFamily.countDocuments()) > 0 && !(await ProductFamily.findOne({ familyId: FAMILY }))) {
    const { builtInFamilyDocs } = await import('../controllers/productFamilyController.js');
    const doc = (await builtInFamilyDocs()).find((item) => item.familyId === FAMILY);
    await ProductFamily.create(doc);
    done.push(`table added (${doc.rows.length} models)`);
  }

  const group = await ProductGroup.findOne({ groupId: 'planters' });
  if (group?.quoteOnly) {
    group.quoteOnly = false;
    await group.save();
    done.push('group shows its models');
  }

  return done;
}

const MIGRATIONS = [
  ['2026-11-rectangular-group', rectangularGroup],
  ['2026-11-planters-table', plantersTable],
];

export async function runCatalogueMigrations() {
  const settings = await getSiteSettings();
  const applied = settings.catalogueMigrations || [];
  let changed = false;

  for (const [id, run] of MIGRATIONS) {
    if (applied.includes(id)) continue;
    const done = await run();
    await SiteSettings.updateOne({ singleton: 'site' }, { $set: { catalogueMigrations: [...applied, id] } });
    applied.push(id);
    console.log(`[catalogue] ${id}: ${done.length ? done.join(', ') : 'nothing to change'}`);
    changed ||= done.length > 0;
  }

  // The site is rebuilt from the panel (Yayınla) to show the change
  if (changed) await markContentChanged();
  return changed;
}
