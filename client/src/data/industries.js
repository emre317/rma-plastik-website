import { Building2, Car, FlaskConical, Shirt, Ship, Sprout, UtensilsCrossed } from 'lucide-react';

import portfolio from './productPortfolio';

/*
  Industries, in the order of industries.items in the locale files
  (chemicals, food, agriculture, automotive, textile, infrastructure, marine).
  `groups` are product portfolio group ids (data/productPortfolio.js)
  shown as related products on the industries page; `stored` is the stored
  product suggested in the quote form (data/quoteForm.js).
*/
const industries = [
  { slug: 'chemicals', icon: FlaskConical, hue: 200, groups: ['silo', 'treatment', 'vertical'] },
  { slug: 'food', icon: UtensilsCrossed, hue: 28, groups: ['food', 'vertical', 'horizontal'], stored: 'food' },
  { slug: 'agriculture', icon: Sprout, hue: 145, groups: ['vertical', 'horizontal', 'twoLayer'], stored: 'water' },
  { slug: 'automotive', icon: Car, hue: 222, groups: ['fuel', 'custom'], stored: 'adblue' },
  { slug: 'textile', icon: Shirt, hue: 262, groups: ['textile'] },
  { slug: 'infrastructure', icon: Building2, hue: 210, groups: ['barriers', 'vertical'] },
  { slug: 'marine', icon: Ship, hue: 190, groups: ['custom'] },
];

/*
  Industries that use a product table family (through its portfolio group),
  with their index in industries.items, e.g. for "Used in" on model pages.
*/
export function industriesForFamily(familyId) {
  const groups = portfolio.filter((group) => group.families.includes(familyId)).map((group) => group.id);
  return industries
    .map((industry, index) => ({ ...industry, index }))
    .filter((industry) => industry.groups.some((id) => groups.includes(id)));
}

export default industries;
