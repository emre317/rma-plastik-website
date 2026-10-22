/*
  Built-in product groups (order and names of the sectors brief). Used until
  product groups are saved in the admin panel (Ürün Grupları), and imported
  into the database from there. No imports: the server reads this file too.
  Texts live in the locale files under productExplorer.items.<id>.

  page: where "Modelleri İncele" opens – the group's first product table,
        the water tanks page or the custom molding page
  quoteOnly: made to order, no model table yet (the card asks for a quote)
  monoblock: one-piece product (trust badge on model pages)
  category: main category, the tabs above the home page product cards
            (tanks, textile, chemical, food, other – productTables.groups.<id>)
*/

const IMG = '/images/products';
const ILL = '/images/products/illustrations';

const groups = [
  { id: 'vertical', category: 'tanks', image: `${IMG}/rd-15000.webp`, hue: 214 },
  { id: 'horizontal', category: 'tanks', image: `${IMG}/ry-1000.webp`, hue: 204 },
  { id: 'twoLayer', category: 'tanks', image: `${IMG}/sd-set.webp`, hue: 196 },
  { id: 'silo', category: 'chemical', image: `${IMG}/silo-tank.webp`, hue: 226 },
  { id: 'textile', category: 'textile', image: `${IMG}/textile-trolley.webp`, hue: 262, monoblock: false },
  { id: 'copBoxes', category: 'textile', image: `${IMG}/cop-box.webp`, hue: 250, monoblock: false },
  { id: 'ropeCans', category: 'textile', image: `${IMG}/rope-dyeing-can.webp`, hue: 236, monoblock: false },
  { id: 'confit', category: 'chemical', image: `${ILL}/confit.svg`, hue: 186 },
  { id: 'food', category: 'food', image: `${IMG}/pickle-tank.webp`, hue: 30 },
  { id: 'treatment', category: 'chemical', image: `${IMG}/chlor-tank.webp`, hue: 190 },
  { id: 'vehicle', category: 'other', image: `${ILL}/vehicle.svg`, hue: 218, quoteOnly: true },
  { id: 'fuel', category: 'other', image: `${IMG}/adblue-tank.webp`, hue: 222 },
  { id: 'pallets', category: 'other', image: `${ILL}/pallets.svg`, hue: 28 },
  { id: 'bins', category: 'other', image: `${ILL}/bins.svg`, hue: 150 },
  { id: 'barriers', category: 'other', image: `${IMG}/road-barrier.webp`, hue: 0 },
  { id: 'planters', category: 'other', image: `${ILL}/planters.svg`, hue: 140, quoteOnly: true },
  { id: 'custom', category: 'other', image: '/images/custom-molding/train-tank.webp', hue: 240, page: 'custom' },
].map((group) => ({ page: 'tables', quoteOnly: false, monoblock: true, category: 'other', ...group }));

export default groups;
