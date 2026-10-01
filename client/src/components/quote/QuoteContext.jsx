import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import products from '../../data/products';

const QuoteContext = createContext(null);

/*
  Shared state for the "Request a quote" dialog.
  Any button can open it with openQuote(productQuoteName?).
  Old links such as /contact?product=<slug> still open it with that product.
*/
export function QuoteProvider({ children }) {
  const [state, setState] = useState({ open: false, product: '' });
  const [searchParams, setSearchParams] = useSearchParams();

  const openQuote = useCallback((product = '') => {
    setState({ open: true, product: typeof product === 'string' ? product : '' });
  }, []);

  const closeQuote = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  const productSlug = searchParams.get('product');

  useEffect(() => {
    if (!productSlug) {
      return;
    }

    const product = products.find((item) => item.slug === productSlug);

    openQuote(product ? product.quoteName : '');

    const next = new URLSearchParams(searchParams);
    next.delete('product');
    setSearchParams(next, { replace: true });
  }, [productSlug, searchParams, setSearchParams, openQuote]);

  const value = useMemo(
    () => ({ ...state, openQuote, closeQuote }),
    [state, openQuote, closeQuote]
  );

  return (
    <QuoteContext.Provider value={value}>
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuote() {
  const context = useContext(QuoteContext);

  if (!context) {
    throw new Error('useQuote must be used inside QuoteProvider');
  }

  return context;
}
