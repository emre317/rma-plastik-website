/*
  Built-in product catalogue (fallback until products are managed in the admin
  panel; also used by `npm run seed-content` in the server to fill the database).
  Display text lives in the locale files under `catalog.<slug>`.
*/
const builtInProducts = [
  {
    slug: 'industrial-storage-tank',
    category: 'industrial-tanks',
    quoteName: 'Industrial Storage Tank',
    featured: true,
  },
  {
    slug: 'chemical-storage-tank',
    category: 'chemical-tanks',
    quoteName: 'Chemical Storage Tank',
    featured: true,
  },
  {
    slug: 'water-storage-tank',
    category: 'water-tanks',
    quoteName: 'Water Storage Tank',
    featured: true,
  },
  {
    slug: 'agricultural-tank',
    category: 'agriculture',
    quoteName: 'Agricultural Tank',
    featured: false,
  },
  {
    slug: 'custom-engineered-product',
    category: 'custom',
    quoteName: 'Custom Engineered Product',
    featured: true,
  },
];

export default builtInProducts;
