import builtInSectors from '../data/sectors.builtin';

/*
  Puts the texts of the product groups and sectors saved in the admin panel
  (content.productGroups / content.sectors) into a locale object:
    productExplorer.items.<group id>  { label, title, description, application }
    industries.items                  [{ title, description, products: [names] }]
  A field left empty in this language falls back to the locale's own text for
  the same group/sector, then to the Turkish admin text.
*/
const GROUP_FIELDS = ['label', 'title', 'description', 'application'];

export default function applyCatalogue(locale, content, lang) {
  const result = locale;
  const groups = Array.isArray(content?.productGroups) && content.productGroups.length ? content.productGroups : null;
  const sectors = Array.isArray(content?.sectors) && content.sectors.length ? content.sectors : null;

  if (groups && result.productExplorer) {
    const own = result.productExplorer.items || {};
    const items = { ...own };

    groups.forEach((group) => {
      items[group.id] = Object.fromEntries(GROUP_FIELDS.map((field) => [
        field,
        group.i18n?.[lang]?.[field] || own[group.id]?.[field] || group.i18n?.tr?.[field] || '',
      ]));
    });

    result.productExplorer.items = items;
  }

  if (sectors && result.industries) {
    const own = Array.isArray(result.industries.items) ? result.industries.items : [];
    const ownOf = (id) => own[builtInSectors.findIndex((sector) => sector.id === id)] || {};

    result.industries.items = sectors.map((sector) => ({
      title: sector.i18n?.[lang]?.title || ownOf(sector.id).title || sector.i18n?.tr?.title || '',
      description: sector.i18n?.[lang]?.description || ownOf(sector.id).description || sector.i18n?.tr?.description || '',
      products: (sector.products || []).map((product) => product.i18n?.[lang]?.name || product.i18n?.tr?.name || ''),
    }));
  }

  return result;
}
