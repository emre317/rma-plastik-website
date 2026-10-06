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
  Shared state for the "Request a quote" dialog and the quote cart.

  openQuote(productQuoteName?) or openQuote({ name, title, code, image, capacity, specs, summary })
    opens the dialog for one product.
  addToCart(product) / openCart() collect several catalogue models and request
    one quote for all of them (quantities per model).
  Old links such as /contact?product=<slug> still open it with that product.
*/
export function QuoteProvider({ children }) {
  const [state, setState] = useState({ open: false, product: '', details: null, mode: 'single' });
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

  const openQuote = useCallback((product = '') => {
    if (product && typeof product === 'object') {
      setState({ open: true, product: product.name || '', details: product, mode: 'single' });
      return;
    }

    setState({ open: true, product: typeof product === 'string' ? product : '', details: null, mode: 'single' });
  }, []);

  const openCart = useCallback(() => {
    setState({ open: true, product: '', details: null, mode: 'cart' });
  }, []);

  const closeQuote = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  const clearProduct = useCallback(() => {
    setState((current) => ({ ...current, product: '', details: null }));
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
