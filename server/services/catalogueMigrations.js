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
  horizontal tanks, the table and the sector products that show it move there.
*/
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
    const products = (sector.products || []).filter((product) =>
      product.group !== GROUP && product.families?.length === 1 && product.families[0] === FAMILY);
    if (!products.length) continue;
    products.forEach((product) => { product.group = GROUP; });
    await sector.save();
    done.push(`sector "${sector.sectorId}" updated`);
  }

  return done;
}

const MIGRATIONS = [['2026-11-rectangular-group', rectangularGroup]];

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
