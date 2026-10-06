import { useTranslation } from 'react-i18next';
import { ShoppingBag } from 'lucide-react';

import { useQuote } from './QuoteContext';

/* Floating "Quote cart (3)" button, shown while the cart has items */
export default function QuoteCartButton() {
  const { t } = useTranslation();
  const { cart, openCart, open } = useQuote();

  if (cart.length === 0 || open) {
    return null;
  }

  const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <button type="button" className="quoteCartFab" onClick={openCart}>
      <span className="quoteCartFabIcon" aria-hidden="true">
        <ShoppingBag />
        <span>{cart.length}</span>
      </span>
      <span className="quoteCartFabText">
        <strong>{t('quoteCart.button')}</strong>
        <small>{t('quoteCart.summary', { count: cart.length, total })}</small>
      </span>
    </button>
  );
}
