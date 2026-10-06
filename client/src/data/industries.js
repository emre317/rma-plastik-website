import { Building2, Car, FlaskConical, Shirt, Ship, Sprout, UtensilsCrossed } from 'lucide-react';

/*
  Industries, in the order of industries.items in the locale files
  (chemicals, food, agriculture, automotive, textile, infrastructure, marine).
  `groups` are product portfolio group ids (data/productPortfolio.js)
  shown as related products on the industries page.
*/
const industries = [
  { slug: 'chemicals', icon: FlaskConical, hue: 200, groups: ['silo', 'treatment', 'vertical'] },
  { slug: 'food', icon: UtensilsCrossed, hue: 28, groups: ['food', 'vertical', 'horizontal'] },
  { slug: 'agriculture', icon: Sprout, hue: 145, groups: ['vertical', 'horizontal', 'twoLayer'] },
  { slug: 'automotive', icon: Car, hue: 222, groups: ['fuel', 'custom'] },
  { slug: 'textile', icon: Shirt, hue: 262, groups: ['textile'] },
  { slug: 'infrastructure', icon: Building2, hue: 210, groups: ['barriers', 'vertical'] },
  { slug: 'marine', icon: Ship, hue: 190, groups: ['custom'] },
];

export default industries;
