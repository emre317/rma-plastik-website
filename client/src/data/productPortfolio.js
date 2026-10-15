import content from '@content';

import families from './productTables';
import builtInGroups from './productGroups.builtin';

/*
  Product groups (menu, Products page, home "Ürün portföyü"): the groups saved
  in the admin panel (Ürün Grupları), else the built-in ones. A group is made
  of the product tables whose `group` is its id, so model counts and volume
  ranges follow the tables. Texts: productExplorer.items.<id> (admin texts are
  put there by i18n/applyCatalogue.js).
*/

const source = Array.isArray(content.productGroups) && content.productGroups.length
  ? content.productGroups
  : builtInGroups;

// Where "Modelleri İncele" opens
function groupLink(group, members) {
  if (group.page === 'custom') return '/custom-molding';
  if (group.quoteOnly) return `/products#${group.id}`;
  if (group.page === 'waterTanks') return '/water-tanks';
  return members.length ? `/product-tables#${members[0].id}` : `/products#${group.id}`;
}

const portfolio = source.map((group) => {
  const custom = group.page === 'custom';
  const members = custom ? [] : families.filter((family) => family.group === group.id);
  const volumes = members.flatMap((family) => family.rows.map((row) => row.volume)).filter((value) => typeof value === 'number');

  return {
    id: group.id,
    image: group.image || '',
    hue: Number.isFinite(group.hue) ? group.hue : 210,
    quoteOnly: Boolean(group.quoteOnly) && !custom,
    monoblock: group.monoblock !== false,
    custom,
    round: custom,
    // Water tank tables can be chosen with the tank finder
    finder: !group.quoteOnly && members.some((family) => family.waterTank),
    families: members.map((family) => family.id),
    members,
    models: members.reduce((sum, family) => sum + family.rows.length, 0),
    minVolume: volumes.length ? Math.min(...volumes) : null,
    maxVolume: volumes.length ? Math.max(...volumes) : null,
    link: groupLink(group, members),
  };
}).filter((group) => group.custom || group.quoteOnly || group.models > 0);

export const groupById = (id) => portfolio.find((group) => group.id === id) || null;

/* Early generic product slugs (blog links, old URLs) -> product group */
export const LEGACY_PRODUCT_GROUPS = {
  'industrial-storage-tank': 'vertical',
  'chemical-storage-tank': 'silo',
  'water-storage-tank': 'vertical',
  'agricultural-tank': 'vertical',
  'custom-engineered-product': 'custom',
};

export const totals = {
  families: families.length,
  models: families.reduce((sum, family) => sum + family.rows.length, 0),
};

export default portfolio;
