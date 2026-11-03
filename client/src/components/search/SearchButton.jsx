import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

import { preloadSearch, useSearch } from './SearchContext';

/* "⌘ K" on Apple devices, "Ctrl K" elsewhere (decided after hydration) */
function useShortcutLabel() {
  const [label, setLabel] = useState('Ctrl K');

  useEffect(() => {
    const platform = navigator.userAgentData?.platform || navigator.platform || '';
    if (/mac|iphone|ipad/i.test(platform)) setLabel('⌘ K');
  }, []);

  return label;
}

/*
  Search trigger.
  variant 'header': pill with the shortcut on wide screens, round icon button below
  variant 'field':  a full-width search field look (mobile menu, 404 page)
*/
export default function SearchButton({ variant = 'header', className = '', source = variant }) {
  const { t } = useTranslation();
  const { openSearch } = useSearch();
  const shortcut = useShortcutLabel();

  return (
    <button
      type="button"
      className={`searchTrigger searchTrigger-${variant} ${className}`.trim()}
      onClick={() => openSearch('', source)}
      onPointerEnter={preloadSearch}
      onFocus={preloadSearch}
      aria-label={t('search.open')}
      aria-keyshortcuts="Control+K Meta+K"
      title={`${t('search.open')} (${shortcut})`}
    >
      <Search className="searchTriggerIcon" aria-hidden="true" />
      <span className="searchTriggerLabel">{variant === 'field' ? t('search.placeholderShort') : t('search.label')}</span>
      <kbd className="searchTriggerKbd" aria-hidden="true">{shortcut}</kbd>
    </button>
  );
}
