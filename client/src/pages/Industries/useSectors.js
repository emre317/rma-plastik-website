import { useTranslation } from 'react-i18next';

import INDUSTRIES, { sectorProduct } from '../../data/industries';

/*
  The sectors with their look (icon, colour) and their products under the
  sector's own names (industries.items in the locale files), for the
  industries overview and the sector detail pages.
*/
export default function useSectors() {
  const { t } = useTranslation();
  const items = t('industries.items', { returnObjects: true });
  const list = Array.isArray(items) ? items : [];

  return list.map((industry, index) => {
    const look = INDUSTRIES[index % INDUSTRIES.length];
    const names = Array.isArray(industry.products) ? industry.products : [];
    const products = look.products
      .map((entry, i) => ({ ...sectorProduct(entry), name: names[i] || '' }))
      .filter((item) => item.name);

    // Photos of the sector's products, each picture once
    const images = [...new Set(products.map((item) => item.image).filter(Boolean))];

    return {
      index,
      look,
      industry,
      products,
      images,
      firstGroup: look.products.find((entry) => entry.group)?.group,
    };
  });
}
