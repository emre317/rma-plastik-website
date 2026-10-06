import content from '@content';

import builtInFamilies, { COLUMN_KEYS, GROUPS, WATER_USES } from './productTables.builtin';

/*
  Product tables shown on /product-tables and /water-tanks.
  Families saved in the admin panel (Ürün tabloları) replace the built-in
  brochure tables once published.

  Family: { id, group, image, columns, rows: [{ code, image?, ...values }],
            waterTank: { orientation, layer, uses } | null, i18n? }
*/

const sourceFamilies = Array.isArray(content.productFamilies) && content.productFamilies.length
  ? content.productFamilies
  : builtInFamilies;

/* "RD 10000 B" -> "rd-10000-b", "ŞD 500" -> "sd-500" */
export function modelSlug(code) {
  return String(code)
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'model';
}

// Every row gets a slug that is unique within its family (model page address)
const families = sourceFamilies.map((family) => {
  const seen = {};

  return {
    ...family,
    rows: family.rows.map((row) => {
      const base = modelSlug(row.code);
      seen[base] = (seen[base] || 0) + 1;
      return { ...row, slug: seen[base] > 1 ? `${base}-${seen[base]}` : base };
    }),
  };
});

/* Model page: /product-tables/<family id>/<model slug> */
export const modelPath = (family, row) => `/product-tables/${family.id}/${row.slug}`;

export const modelPaths = () => families.flatMap((family) => family.rows.map((row) => modelPath(family, row)));

export function findModel(familyId, slug) {
  const family = families.find((item) => item.id === familyId);
  const row = family?.rows.find((item) => item.slug === slug);
  return family && row ? { family, row } : null;
}

/* Up to `count` models of the same family, closest in volume (or in table order) */
export function similarModels(family, row, count = 4) {
  const index = family.rows.indexOf(row);

  return family.rows
    .filter((item) => item !== row)
    .map((item, i) => ({
      item,
      distance:
        typeof row.volume === 'number' && typeof item.volume === 'number'
          ? Math.abs(item.volume - row.volume)
          : Math.abs(family.rows.indexOf(item) - index),
      i,
    }))
    .sort((a, b) => a.distance - b.distance || a.i - b.i)
    .slice(0, count)
    .map(({ item }) => item);
}

export const groups = GROUPS.filter((group) => families.some((family) => family.group === group));

export { COLUMN_KEYS, WATER_USES };

export default families;

/* Text of a family: admin text in the language → Turkish admin text → built-in locale text */
export function familyText(family, field, lang, t) {
  return (
    family.i18n?.[lang]?.[field] ||
    family.i18n?.tr?.[field] ||
    t(`productTables.families.${family.id}.${field}`, { defaultValue: '' })
  );
}

/* Water tank selector: every row of a family marked as water tank */
export const waterTanks = families
  .filter((family) => family.waterTank)
  .flatMap((family) =>
    family.rows
      .filter((row) => typeof row.volume === 'number' && typeof row.height === 'number')
      .map((row) => ({
        ...row,
        family: family.id,
        familyData: family,
        orientation: family.waterTank.orientation,
        layer: family.waterTank.layer,
        uses: family.waterTank.uses || [],
        image: row.image || family.image,
        diameter: typeof row.diameter === 'number' ? row.diameter : Number.parseFloat(row.diameter) || 0,
      }))
  );
