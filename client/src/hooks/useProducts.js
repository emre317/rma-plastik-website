import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import products from '../data/products';

const TEXT_FIELDS = [
  'name',
  'categoryLabel',
  'capacity',
  'material',
  'application',
  'technology',
  'description',
];

/* Products merged with their text in the active language. */
export default function useProducts() {
  const { t, i18n } = useTranslation();

  return useMemo(
    () =>
      products.map((product) => {
        const localized = { ...product };

        TEXT_FIELDS.forEach((field) => {
          localized[field] = t(`catalog.${product.slug}.${field}`);
        });

        return localized;
      }),
    // i18n.language: recompute when the language changes
    [t, i18n.language]
  );
}
