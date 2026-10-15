import content from '@content';

import portfolio from './productPortfolio';
import families from './productTables';
import builtInSectors from './sectors.builtin';
import { sectorIcon } from './sectorIcons';

/*
  Sectors (/industries and /industries/:slug): the sectors saved in the admin
  panel (Sektörler), else the built-in ones of the sectors brief. Texts come
  from industries.items in the same order (admin texts are put there by
  i18n/applyCatalogue.js); products[j] is named industries.items[i].products[j].
    { group }               a product group
    { group, families }     only these product tables of the group
    { quote: true }         made to order, no catalogue entry yet
  `stored` is the stored product suggested in the quote form (data/quoteForm.js).
*/
const source = Array.isArray(content.sectors) && content.sectors.length ? content.sectors : builtInSectors;

const industries = source.map((sector) => ({
  slug: sector.id,
  icon: sectorIcon(sector.icon),
  hue: Number.isFinite(sector.hue) ? sector.hue : 210,
  stored: sector.stored || '',
  products: (sector.products || []).map((entry) => {
    const families = Array.isArray(entry.families) ? entry.families : [];
    return {
      group: entry.group || '',
      families,
      // First table stands for the card (text, photo, link)
      family: families[0] || '',
      quote: !entry.group,
    };
  }),
}));

// Sector slugs of the earlier list -> the sector that now covers them
export const LEGACY_INDUSTRIES = {
  agriculture: 'water',
  automotive: 'chemicals',
  infrastructure: 'traffic',
  marine: '',
};

const groupById = Object.fromEntries(portfolio.map((group) => [group.id, group]));
const familyById = Object.fromEntries(families.map((family) => [family.id, family]));

/*
  A sector product resolved for display: group, family (if any), image and link.
  Made-to-order entries (and groups without a model table or no longer shown)
  have no link and show the sector icon.
*/
export function sectorProduct(entry) {
  const group = entry.group ? groupById[entry.group] || null : null;
  const family = entry.families.map((id) => familyById[id]).find(Boolean) || null;
  const quote = entry.quote || !group;

  // A table that was removed in the admin panel falls back to its group
  const image = quote ? '' : family?.image || (entry.families.length ? '' : group.image) || '';
  const link = quote || group.quoteOnly
    ? ''
    : family ? (group.link === '/water-tanks' ? '/water-tanks' : `/product-tables#${family.id}`) : group.link || '';

  return { ...entry, quote, groupData: group, familyData: family, image, link };
}

/*
  Sectors that use a product table (directly or through its group), with
  their index in industries.items, e.g. for "Used in" on model pages.
*/
export function industriesForFamily(familyId) {
  const groupId = familyById[familyId]?.group;

  return industries
    .map((industry, index) => ({ ...industry, index }))
    .filter((industry) => industry.products.some((entry) =>
      entry.families.length ? entry.families.includes(familyId) : Boolean(entry.group) && entry.group === groupId));
}

export default industries;
