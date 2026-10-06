import content from '@content';

import builtInProducts from './products.builtin';

/*
  Product structure. When products are managed in the admin panel they come
  from the published content snapshot (`@content`, see vite.config.js) with
  their own texts in `i18n`; otherwise the built-in list is used.

  `quoteName` is the English name sent with quote requests so the admin
  panel always shows a consistent product name whatever the site language.
*/

const products = Array.isArray(content.products) ? content.products : builtInProducts;

export default products;
