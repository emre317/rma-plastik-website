import { Droplets, Filter, FlaskConical, Layers, Shirt, TrafficCone, Trees, UtensilsCrossed } from 'lucide-react';

import portfolio from './productPortfolio';
import families from './productTables';

/*
  Sectors of the "Sektörünüze göre ürün arayın" brief, in the order of
  industries.items in the locale files. `products` follows the order of
  industries.items[i].products (the sector's own product names):
    { group }            a product group (data/productPortfolio.js)
    { group, family }    one product table family of that group
                         (`also`: further families the card stands for)
    { quote: true }      produced on request, no catalogue entry yet
  `stored` is the stored product suggested in the quote form (data/quoteForm.js).
*/
const industries = [
  {
    slug: 'water', icon: Droplets, hue: 205, stored: 'water',
    products: [{ group: 'vertical' }, { group: 'horizontal' }, { group: 'fuel', family: 'rectangular-tanks' }, { group: 'twoLayer' }],
  },
  {
    slug: 'treatment', icon: Filter, hue: 190,
    products: [{ group: 'vertical' }, { group: 'treatment' }, { group: 'silo', family: 'silo-tanks' }],
  },
  {
    slug: 'textile', icon: Shirt, hue: 262,
    products: [
      { group: 'textile', family: 'cylinder-trolleys' },
      { group: 'textile', family: 'textile-trolleys' },
      { group: 'textile', family: 'stackable-rectangular', also: ['stackable-cylinder'] },
      { group: 'copBoxes' },
      { group: 'ropeCans' },
      { group: 'silo', family: 'silo-tanks' },
      { group: 'vertical' },
      { quote: true },
      { quote: true },
    ],
  },
  {
    slug: 'food', icon: UtensilsCrossed, hue: 28, stored: 'food',
    products: [
      { group: 'vertical' },
      { group: 'food', family: 'brine-tanks' },
      { group: 'food', family: 'pickle-tanks' },
      { quote: true, group: 'food' },
      { group: 'silo', family: 'mixer-silo-tanks' },
      { group: 'silo', family: 'silo-tanks' },
    ],
  },
  {
    slug: 'chemicals', icon: FlaskConical, hue: 200,
    products: [
      { group: 'vertical' },
      { group: 'silo', family: 'mixer-silo-tanks' },
      { group: 'silo', family: 'silo-tanks' },
      { group: 'treatment' },
      { group: 'vehicle' },
      { group: 'fuel', family: 'adblue-tanks' },
      { group: 'silo', family: 'mixer-silo-tanks' },
      { group: 'confit' },
    ],
  },
  { slug: 'traffic', icon: TrafficCone, hue: 0, products: [{ group: 'barriers' }] },
  { slug: 'landscape', icon: Trees, hue: 140, products: [{ group: 'planters' }, { group: 'planters' }] },
  { slug: 'pallets', icon: Layers, hue: 28, products: [{ group: 'pallets' }, { group: 'pallets' }] },
];

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
  Quote-only entries (and groups without a model table) have no link.
*/
export function sectorProduct(entry) {
  const group = entry.group ? groupById[entry.group] : null;
  const family = entry.family ? familyById[entry.family] : null;

  // A family that was removed in the admin panel falls back to its group
  // Quote-only entries show the sector icon rather than a look-alike photo
  const image = entry.quote ? '' : family?.image || (entry.family ? '' : group?.image) || '';
  const link = entry.quote || group?.quoteOnly
    ? ''
    : family ? (entry.group === 'vertical' ? '/water-tanks' : `/product-tables#${family.id}`) : group?.link || '';

  return { ...entry, groupData: group, familyData: family, image, link };
}

/*
  Sectors that use a product table family (directly or through its group),
  with their index in industries.items, e.g. for "Used in" on model pages.
*/
export function industriesForFamily(familyId) {
  const groups = portfolio.filter((group) => group.families.includes(familyId)).map((group) => group.id);
  return industries
    .map((industry, index) => ({ ...industry, index }))
    .filter((industry) => industry.products.some((entry) => entry.family === familyId || entry.also?.includes(familyId) || (!entry.family && groups.includes(entry.group))));
}

export default industries;
