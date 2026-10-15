/*
  Built-in product groups (order and names of the sectors brief). Used until
  product groups are saved in the admin panel (Ürün Grupları), and imported
  into the database from there. No imports: the server reads this file too.
  Texts live in the locale files under productExplorer.items.<id>.

  page: where "Modelleri İncele" opens – the group's first product table,
        the water tanks page or the custom molding page
  quoteOnly: made to order, no model table yet (the card asks for a quote)
  monoblock: one-piece product (trust badge on model pages)
*/

const IMG = '/images/products';
const ILL = '/images/products/illustrations';

const groups = [
  { id: 'vertical', image: `${IMG}/rd-15000.webp`, hue: 214, page: 'waterTanks' },
  { id: 'horizontal', image: `${IMG}/ry-1000.webp`, hue: 204 },
  { id: 'twoLayer', image: `${IMG}/sd-set.webp`, hue: 196 },
  { id: 'underground', image: `${ILL}/underground.svg`, hue: 200, quoteOnly: true },
  { id: 'silo', image: `${IMG}/silo-tank.webp`, hue: 226 },
  { id: 'textile', image: `${IMG}/textile-trolley.webp`, hue: 262, monoblock: false },
  { id: 'copBoxes', image: `${IMG}/cop-box.webp`, hue: 250, monoblock: false },
  { id: 'ropeCans', image: `${IMG}/rope-dyeing-can.webp`, hue: 236, monoblock: false },
  { id: 'confit', image: `${ILL}/confit.svg`, hue: 186 },
  { id: 'food', image: `${IMG}/pickle-tank.webp`, hue: 30 },
  { id: 'treatment', image: `${IMG}/chlor-tank.webp`, hue: 190 },
  { id: 'vehicle', image: `${ILL}/vehicle.svg`, hue: 218, quoteOnly: true },
  { id: 'fuel', image: `${IMG}/adblue-tank.webp`, hue: 222 },
  { id: 'pallets', image: `${ILL}/pallets.svg`, hue: 28, quoteOnly: true },
  { id: 'barriers', image: `${IMG}/road-barrier.webp`, hue: 0 },
  { id: 'planters', image: `${ILL}/planters.svg`, hue: 140, quoteOnly: true },
  { id: 'custom', image: '/images/custom-molding/train-tank.webp', hue: 240, page: 'custom' },
].map((group) => ({ page: 'tables', quoteOnly: false, monoblock: true, ...group }));

export default groups;
