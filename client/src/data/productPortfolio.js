import families from './productTables';

/*
  Home "04 / Ürünler" portfolio: product groups of the brochure, each made of
  one or more product table families. Model counts and volume ranges are
  calculated from the tables (admin panel), so they stay up to date.
  Texts: productExplorer.items.<id> in the locale files.
*/

const IMG = '/images/products';

// Order and names follow the "Ürünlerimiz" list of the sectors brief.
// `quoteOnly`: produced on request, no catalogue models yet (no table, no counts)
const ILL = '/images/products/illustrations';

const GROUPS = [
  { id: 'vertical', families: ['vertical-tanks'], image: `${IMG}/rd-15000.webp`, hue: 214, link: '/water-tanks', finder: true },
  { id: 'horizontal', families: ['horizontal-tanks'], image: `${IMG}/ry-1000.webp`, hue: 204, link: '/product-tables#horizontal-tanks', finder: true },
  { id: 'twoLayer', families: ['two-layer-vertical', 'two-layer-horizontal'], image: `${IMG}/sd-set.webp`, hue: 196, link: '/product-tables#two-layer-vertical', finder: true },
  { id: 'underground', families: [], image: `${ILL}/underground.svg`, hue: 200, link: '/products#underground', quoteOnly: true },
  { id: 'silo', families: ['silo-tanks', 'mixer-silo-tanks'], image: `${IMG}/silo-tank.webp`, hue: 226, link: '/product-tables#silo-tanks' },
  { id: 'textile', families: ['textile-trolleys', 'cylinder-trolleys', 'stackable-rectangular', 'stackable-cylinder'], image: `${IMG}/textile-trolley.webp`, hue: 262, link: '/product-tables#textile-trolleys' },
  { id: 'copBoxes', families: ['cop-boxes', 'yarn-boxes'], image: `${IMG}/cop-box.webp`, hue: 250, link: '/product-tables#cop-boxes' },
  { id: 'ropeCans', families: ['rope-dyeing-cans'], image: `${IMG}/rope-dyeing-can.webp`, hue: 236, link: '/product-tables#rope-dyeing-cans' },
  { id: 'confit', families: ['confit-pools'], image: `${ILL}/confit.svg`, hue: 186, link: '/product-tables#confit-pools' },
  { id: 'food', families: ['brine-tanks', 'pickle-tanks'], image: `${IMG}/pickle-tank.webp`, hue: 30, link: '/product-tables#brine-tanks' },
  { id: 'treatment', families: ['salt-tanks', 'chlor-tanks'], image: `${IMG}/chlor-tank.webp`, hue: 190, link: '/product-tables#salt-tanks' },
  { id: 'vehicle', families: [], image: `${ILL}/vehicle.svg`, hue: 218, link: '/products#vehicle', quoteOnly: true },
  { id: 'fuel', families: ['adblue-tanks', 'rectangular-tanks'], image: `${IMG}/adblue-tank.webp`, hue: 222, link: '/product-tables#adblue-tanks' },
  { id: 'pallets', families: [], image: `${ILL}/pallets.svg`, hue: 28, link: '/products#pallets', quoteOnly: true },
  { id: 'barriers', families: ['road-barriers'], image: `${IMG}/road-barrier.webp`, hue: 0, link: '/product-tables#road-barriers' },
  { id: 'planters', families: [], image: `${ILL}/planters.svg`, hue: 140, link: '/products#planters', quoteOnly: true },
  { id: 'custom', families: [], image: '/images/custom-molding/train-tank.webp', hue: 240, link: '/custom-molding', custom: true, round: true },
];

const portfolio = GROUPS.map((group) => {
  const members = families.filter((family) => group.families.includes(family.id));
  const volumes = members.flatMap((family) => family.rows.map((row) => row.volume)).filter((value) => typeof value === 'number');

  return {
    ...group,
    members,
    models: members.reduce((sum, family) => sum + family.rows.length, 0),
    minVolume: volumes.length ? Math.min(...volumes) : null,
    maxVolume: volumes.length ? Math.max(...volumes) : null,
    // First family in the group decides the link when the group's main family was removed
    link: group.custom || group.quoteOnly || members.some((family) => group.link.endsWith(`#${family.id}`)) || !group.link.includes('#')
      ? group.link
      : `/product-tables#${members[0]?.id || ''}`,
  };
}).filter((group) => group.custom || group.quoteOnly || group.models > 0);

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
