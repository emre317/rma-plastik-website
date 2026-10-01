/*
  Product structure only. Display text (name, capacity, description...)
  lives in the locale files under `catalog.<slug>`.

  `quoteName` is the English name sent with quote requests so the admin
  panel always shows a consistent product name whatever the site language.
*/
const products = [
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

export default products;
