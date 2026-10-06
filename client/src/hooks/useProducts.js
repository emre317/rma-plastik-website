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

        const lang = i18n.resolvedLanguage || i18n.language;

        // Admin-managed text first, then the built-in locale text, then Turkish
        TEXT_FIELDS.forEach((field) => {
          localized[field] =
            product.i18n?.[lang]?.[field] ||
            t(`catalog.${product.slug}.${field}`, { defaultValue: '' }) ||
            product.i18n?.tr?.[field] ||
            '';
        });

        return localized;
      }),
    // i18n.language: recompute when the language changes
    [t, i18n.language]
  );
}
