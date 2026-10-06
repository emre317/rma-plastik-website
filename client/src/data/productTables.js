import content from '@content';

import builtInFamilies, { COLUMN_KEYS, GROUPS, WATER_USES } from './productTables.builtin';

/*
  Product tables shown on /product-tables and /water-tanks.
  Families saved in the admin panel (Ürün tabloları) replace the built-in
  brochure tables once published.

  Family: { id, group, image, columns, rows: [{ code, image?, ...values }],
            waterTank: { orientation, layer, uses } | null, i18n? }
*/

const families = Array.isArray(content.productFamilies) && content.productFamilies.length
  ? content.productFamilies
  : builtInFamilies;

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
