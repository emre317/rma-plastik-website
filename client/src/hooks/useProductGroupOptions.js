import { useEffect, useState } from 'react';

import tr from '../i18n/locales/tr';
import useAdminApi from './useAdminApi';
import { listProductGroups } from '../services/adminContentApi';
import builtInGroups from '../data/productGroups.builtin';
import builtInFamilies, { LEGACY_GROUPS } from '../data/productTables.builtin';

const builtInLabel = (id) => tr.productExplorer.items?.[id]?.label || id;
const builtInGroupOf = Object.fromEntries(builtInFamilies.map((family) => [family.id, family.group]));

/* Product group of a saved table: categories of the first version map to the brochure table's group */
export const tableGroup = (family) =>
  !family?.group || LEGACY_GROUPS.includes(family.group) ? builtInGroupOf[family?.familyId] || '' : family.group;

/*
  Product groups a product table can belong to (Ürün Grupları in the panel,
  else the built-in ones), for dropdowns and labels in the admin panel.
*/
export default function useProductGroupOptions() {
  const call = useAdminApi();
  const [groups, setGroups] = useState(() => builtInGroups.map((group) => ({ id: group.id, label: builtInLabel(group.id), page: group.page })));

  useEffect(() => {
    let active = true;

    call(listProductGroups)
      .then(({ data }) => {
        if (active && Array.isArray(data) && data.length) {
          setGroups(data.map((group) => ({ id: group.groupId, label: group.i18n?.tr?.label || group.groupId, page: group.page, published: group.published })));
        }
      })
      .catch(() => {});

    return () => { active = false; };
  }, [call]);

  const labelOf = (id) => groups.find((group) => group.id === id)?.label || (id ? id : 'Grupsuz');
  // Custom molding has no tables
  const options = groups.filter((group) => group.page !== 'custom').map((group) => ({ value: group.id, label: group.label }));

  return { groups, options, labelOf };
}
