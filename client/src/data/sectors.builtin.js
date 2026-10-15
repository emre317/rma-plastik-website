/*
  Built-in sectors of the "Sektörünüze göre ürün arayın" brief. Used until
  sectors are saved in the admin panel (Sektörler), and imported into the
  database from there. No imports: the server reads this file too.
  Texts live in the locale files under industries.items (same order); each
  product's name is industries.items[i].products[j].

  products: { group }                 a product group (productGroups.builtin.js)
            { group, families: [...] } only these tables of the group
            {}                        made to order, no catalogue entry yet
  icon: a key of data/sectorIcons.js; stored: quote form stored product
*/

const sectors = [
  {
    id: 'water', icon: 'droplets', hue: 205, stored: 'water',
    products: [{ group: 'vertical' }, { group: 'horizontal' }, { group: 'fuel', families: ['rectangular-tanks'] }, { group: 'twoLayer' }],
  },
  {
    id: 'treatment', icon: 'filter', hue: 190,
    products: [{ group: 'vertical' }, { group: 'treatment' }, { group: 'silo', families: ['silo-tanks'] }],
  },
  {
    id: 'textile', icon: 'shirt', hue: 262,
    products: [
      { group: 'textile', families: ['cylinder-trolleys'] },
      { group: 'textile', families: ['textile-trolleys'] },
      { group: 'textile', families: ['stackable-rectangular', 'stackable-cylinder'] },
      { group: 'copBoxes' },
      { group: 'ropeCans' },
      { group: 'silo', families: ['silo-tanks'] },
      { group: 'vertical' },
      {},
      {},
    ],
  },
  {
    id: 'food', icon: 'utensils', hue: 28, stored: 'food',
    products: [
      { group: 'vertical' },
      { group: 'food', families: ['brine-tanks'] },
      { group: 'food', families: ['pickle-tanks'] },
      {},
      { group: 'silo', families: ['mixer-silo-tanks'] },
      { group: 'silo', families: ['silo-tanks'] },
    ],
  },
  {
    id: 'chemicals', icon: 'flask', hue: 200,
    products: [
      { group: 'vertical' },
      { group: 'silo', families: ['mixer-silo-tanks'] },
      { group: 'silo', families: ['silo-tanks'] },
      { group: 'treatment' },
      { group: 'vehicle' },
      { group: 'fuel', families: ['adblue-tanks'] },
      { group: 'silo', families: ['mixer-silo-tanks'] },
      { group: 'confit' },
    ],
  },
  { id: 'traffic', icon: 'traffic', hue: 0, products: [{ group: 'barriers' }] },
  { id: 'landscape', icon: 'trees', hue: 140, products: [{ group: 'planters' }, { group: 'planters' }] },
  { id: 'pallets', icon: 'layers', hue: 28, products: [{ group: 'pallets' }, { group: 'pallets' }] },
].map((sector) => ({
  stored: '',
  ...sector,
  products: sector.products.map((entry) => ({ group: '', families: [], ...entry })),
}));

export default sectors;
