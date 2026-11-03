import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

import { preloadSearch, useSearch } from './SearchContext';

/*
  Search trigger with the look of a search field: products mega menu,
  products page header, home product portfolio, mobile menu, 404 page.
  (Ctrl/⌘ K and "/" open the search everywhere without being shown.)
*/
export default function SearchButton({ variant = 'field', className = '', source = variant, short = false }) {
  const { t } = useTranslation();
  const { openSearch } = useSearch();

  return (
    <button
      type="button"
      className={`searchTrigger searchTrigger-${variant} ${className}`.trim()}
      onClick={() => openSearch('', source)}
      onPointerEnter={preloadSearch}
      onFocus={preloadSearch}
      aria-label={t('search.open')}
      aria-keyshortcuts="Control+K Meta+K"
    >
      <Search className="searchTriggerIcon" aria-hidden="true" />
      <span className="searchTriggerLabel">{short ? t('search.placeholderMini') : t('search.placeholderShort')}</span>
    </button>
  );
}
