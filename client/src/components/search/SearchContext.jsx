import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { track } from '../../analytics/track';

const SearchContext = createContext(null);

// The dialog downloads on first use (or when the visitor points at the button)
const loadDialog = () => import('./SearchDialog');
const SearchDialog = lazy(loadDialog);

export const preloadSearch = () => {
  loadDialog().catch(() => {});
};

const isTyping = (element) =>
  element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName));

/*
  Site search: openSearch(query?) opens the dialog from anywhere.
  Shortcuts: Ctrl/⌘ + K everywhere, "/" when the visitor is not typing.
*/
export function SearchProvider({ children }) {
  const [state, setState] = useState({ open: false, query: '', mounted: false });
  const { pathname } = useLocation();

  const openSearch = useCallback((query = '', source = 'button') => {
    setState({ open: true, query: typeof query === 'string' ? query : '', mounted: true });
    track('search_open', { source });
  }, []);

  const closeSearch = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  // A new page closes the dialog (a result was opened)
  useEffect(() => {
    setState((current) => (current.open ? { ...current, open: false } : current));
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key?.toLowerCase();

      if (key === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault();
        setState((current) => {
          if (current.open) return { ...current, open: false };
          track('search_open', { source: 'shortcut' });
          return { open: true, query: '', mounted: true };
        });
        return;
      }

      if (key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping(document.activeElement)) {
        // Not while another dialog is open
        if (document.querySelector('.quoteModal.open, .catalogGate.open, [role="dialog"][aria-modal="true"]:not(.srDialog)')) return;
        event.preventDefault();
        openSearch('', 'shortcut');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearch]);

  const value = useMemo(
    () => ({ open: state.open, openSearch, closeSearch }),
    [state.open, openSearch, closeSearch]
  );

  return (
    <SearchContext.Provider value={value}>
      {children}
      {state.mounted && (
        <Suspense fallback={null}>
          <SearchDialog open={state.open} initialQuery={state.query} onClose={closeSearch} />
        </Suspense>
      )}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearch must be used inside SearchProvider');
  return context;
}
