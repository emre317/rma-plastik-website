import { familyText } from './productTables';
import { groupById } from './productPortfolio';

/*
  Description and "Standart özellikler" card of a model page / datasheet.

  Features can be written at three levels in the admin panel and are shown
  together, in this order:
    1. product group  (Ürün Grupları)          – every model of the group
    2. product family (Ürün Tabloları)         – every model of the table
    3. model          (the table's model row)  – that model only
  While neither the group nor the family has a saved list, the brochure list
  of the family is used for the first two.
*/

const textList = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : []);

// List in the page language, else the Turkish one
const savedList = (i18n, lang) => {
  const own = textList(i18n?.[lang]?.features);
  return own.length ? own : textList(i18n?.tr?.features);
};

// The same feature written at two levels is shown once
function unique(list) {
  const seen = new Set();

  return list.filter((item) => {
    const key = item.trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* Brochure feature list of a family; water tanks share the list of the water tank page */
export function builtInFeatures(family, t) {
  const own = textList(t(`productTables.families.${family.id}.features`, { returnObjects: true, defaultValue: [] }));
  if (own.length || !family.waterTank) return own;
  return textList(t('waterTanks.features', { returnObjects: true, defaultValue: [] }));
}

/* { title, items } of the feature card; no items: the card is not shown */
export function productStandard(family, row, lang, t) {
  const group = groupById(family.group);
  const fromGroup = savedList(group?.i18n, lang);
  const fromFamily = savedList(family.i18n, lang);
  const shared = fromGroup.length || fromFamily.length ? [...fromGroup, ...fromFamily] : builtInFeatures(family, t);

  return {
    title:
      family.i18n?.[lang]?.featuresTitle ||
      group?.i18n?.[lang]?.featuresTitle ||
      t(family.waterTank ? 'productModel.standardTitle' : 'productModel.featuresTitle'),
    items: unique([...shared, ...savedList(row?.i18n, lang)]),
  };
}

/* Description under the model code: the model's own text, else the family's */
export const productText = (family, row, lang, t) =>
  row?.i18n?.[lang]?.text || row?.i18n?.tr?.text || familyText(family, 'text', lang, t);
