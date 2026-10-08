import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import useLanguage from './useLanguage';
import formatNumber from '../utils/formatNumber';
import { familyText } from '../data/productTables';

/*
  (family, row) -> product object for the quote form / quote cart:
  { name, title, code, image, capacity, specs (site language), summary (Turkish, for the sales team),
    ref ("family id|model code", used by shared list links) }
*/
export default function useModelQuote() {
  const { t, i18n } = useTranslation();
  const { code: lang } = useLanguage();

  return useCallback(
    (family, row) => {
      const tr = i18n.getFixedT('tr');
      const keys = (family.columns || []).filter((key) => key !== 'code' && key !== 'volume' && row[key] !== undefined && row[key] !== '');

      const specsIn = (tf, language) => [
        ...(family.waterTank
          ? [{
              label: tf('waterTanks.orientation'),
              value: [tf(`waterTanks.${family.waterTank.orientation}`), tf(`waterTanks.${family.waterTank.layer}`)].join(' · '),
            }]
          : []),
        ...keys.map((key) => ({ label: tf(`productTables.columns.${key}`), value: String(formatNumber(row[key], language)) })),
      ];

      const hasVolume = typeof row.volume === 'number';
      const trTitle = familyText(family, 'title', 'tr', tr);

      return {
        name: `${trTitle} – ${row.code}`,
        ref: `${family.id}|${row.code}`,
        title: familyText(family, 'title', lang, t),
        code: row.code,
        image: row.image || family.image || '',
        capacity: hasVolume ? `${formatNumber(row.volume, lang)} L` : '',
        specs: specsIn(t, lang),
        summary: [
          trTitle,
          row.code,
          ...(hasVolume ? [`${tr('productTables.columns.volume')}: ${formatNumber(row.volume, 'tr')}`] : []),
          ...specsIn(tr, 'tr').map((spec) => `${spec.label}: ${spec.value}`),
        ],
      };
    },
    [i18n, lang, t]
  );
}
