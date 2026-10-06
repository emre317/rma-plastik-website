import { useTranslation } from 'react-i18next';
import { Check, Plus } from 'lucide-react';

import { useQuote } from './QuoteContext';

/* Adds a catalogue model to the quote cart; shows "In cart" (click removes it again) */
export default function AddToCartButton({ product, className = '', compact = false, iconOnly = false }) {
  const { t } = useTranslation();
  const { addToCart, removeFromCart, inCart } = useQuote();

  const added = inCart(product.name);

  return (
    <button
      type="button"
      className={`addToCart ${added ? 'added' : ''} ${compact ? 'compact' : ''} ${iconOnly ? 'iconOnly' : ''} ${className}`}
      aria-pressed={added}
      title={added ? t('quoteCart.removeHint') : t('quoteCart.add')}
      onClick={() => (added ? removeFromCart(product.name) : addToCart(product))}
    >
      {added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
      <span className={iconOnly ? 'visuallyHidden' : undefined}>{added ? t('quoteCart.added') : compact ? t('quoteCart.addShort') : t('quoteCart.add')}</span>
    </button>
  );
}
