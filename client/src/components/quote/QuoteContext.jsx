import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import useQuoteShare, { SHARE_PARAM } from '../../hooks/useQuoteShare';
import { track } from '../../analytics/track';

const QuoteContext = createContext(null);

const CART_KEY = 'rma_quote_cart';
const MAX_ITEMS = 30;

function readCart() {
  try {
    const value = JSON.parse(window.localStorage.getItem(CART_KEY));
    return Array.isArray(value) ? value.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // Private mode / blocked storage: the cart simply lives for this visit
  }
}

/*
  Shared state for the "Request a quote" dialog and its product list (cart).

  openQuote()                     opens the dialog (products can be picked inside it)
  openQuote('Topic')              opens it with a subject, e.g. a product group or an industry
  openQuote('Topic', { hint })    hint = { group, stored }: portfolio group and stored product to suggest
  openQuote(model, { quantity })  adds a catalogue model ({ name, title, code, image, capacity,
                                  specs, summary }) to the list and opens the dialog
  addToCart / removeFromCart / setCartQuantity manage the list from any page.
  Old links such as /contact?product=<slug> still open the dialog.
  A shared list link (?list=…, hooks/useQuoteShare.js) adds its models to the list and opens it.
*/
export function QuoteProvider({ children }) {
  const [state, setState] = useState({ open: false, product: '', shared: 0 });
  const [cart, setCart] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();

  // The cart is restored after the first render (no storage during prerender)
  useEffect(() => {
    setCart(readCart());
  }, []);

  const updateCart = useCallback((update) => {
    setCart((current) => {
      const next = update(current).slice(0, MAX_ITEMS);
      writeCart(next);
      return next;
    });
  }, []);

  const addToCart = useCallback(
    (product, quantity = 1) =>
      updateCart((items) =>
        items.some((item) => item.name === product.name)
          ? items
          : [...items, { ...product, quantity: Math.max(1, Number(quantity) || 1) }]
      ),
    [updateCart]
  );

  const openQuote = useCallback((product = '', options = {}) => {
    if (product && typeof product === 'object' && product.name) {
      addToCart(product, options.quantity);
      setState({ open: true, product: '' });
      return;
    }

    // options.hint = { group, stored }: suggestions from the page (e.g. an industry)
    setState({ open: true, product: typeof product === 'string' ? product : '', hint: options.hint || null });
  }, [addToCart]);

  const openCart = useCallback(() => {
    setState((current) => ({ ...current, open: true }));
  }, []);

  const closeQuote = useCallback(() => {
    setState((current) => ({ ...current, open: false, shared: 0 }));
  }, []);

  const clearProduct = useCallback(() => {
    setState((current) => ({ ...current, product: '' }));
  }, []);

  const removeFromCart = useCallback(
    (name) => updateCart((items) => items.filter((item) => item.name !== name)),
    [updateCart]
  );

  const setCartQuantity = useCallback(
    (name, quantity) =>
      updateCart((items) =>
        items.map((item) =>
          item.name === name ? { ...item, quantity: Math.min(99999, Math.max(1, Math.round(Number(quantity) || 1))) } : item
        )
      ),
    [updateCart]
  );

  const clearCart = useCallback(() => updateCart(() => []), [updateCart]);

  const inCart = useCallback((name) => cart.some((item) => item.name === name), [cart]);

  const { readShared } = useQuoteShare();
  const sharedList = searchParams.get(SHARE_PARAM);

  // Shared list link: models are added (quantities from the link) and the dialog opens
  useEffect(() => {
    if (!sharedList) return;

    const shared = readShared(sharedList);

    if (shared.length) {
      updateCart((items) => {
        const next = [...items];
        shared.forEach(({ product, quantity }) => {
          const index = next.findIndex((item) => item.name === product.name);
          if (index >= 0) next[index] = { ...next[index], quantity };
          else next.push({ ...product, quantity });
        });
        return next;
      });
      setState({ open: true, product: '', shared: shared.length });
      track('quote_list_shared_open', { items: shared.length });
    }

    const next = new URLSearchParams(searchParams);
    next.delete(SHARE_PARAM);
    setSearchParams(next, { replace: true });
  }, [sharedList, searchParams, setSearchParams, readShared, updateCart]);

  const productSlug = searchParams.get('product');

  useEffect(() => {
    if (!productSlug) {
      return;
    }

    openQuote();

    const next = new URLSearchParams(searchParams);
    next.delete('product');
    setSearchParams(next, { replace: true });
  }, [productSlug, searchParams, setSearchParams, openQuote]);

  const value = useMemo(
    () => ({
      ...state,
      openQuote,
      openCart,
      closeQuote,
      clearProduct,
      cart,
      addToCart,
      removeFromCart,
      setCartQuantity,
      clearCart,
      inCart,
    }),
    [state, openQuote, openCart, closeQuote, clearProduct, cart, addToCart, removeFromCart, setCartQuantity, clearCart, inCart]
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
