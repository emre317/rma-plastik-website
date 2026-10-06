import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, MapPin, Minus, Package, Phone, Plus, ShoppingBag, X } from 'lucide-react';

import Arrow from '../i18n/Arrow';
import company from '../../data/company';
import useProducts from '../../hooks/useProducts';
import { submitQuote } from '../../services/api';
import { useQuote } from './QuoteContext';
import { track } from '../../analytics/track';

const initialForm = {
  company: '',
  name: '',
  email: '',
  phone: '',
  country: '',
  product: '',
  capacity: '',
  quantity: '',
  application: '',
  message: '',
};

/* Selected model as one line for the sales team (e.g. "Dikey Tanklar · RD 100 · Çap (cm): 48");
   callers may pass a Turkish `summary` so the team reads it the same in every site language */
export function summaryOf(details) {
  if (!details) return '';

  return (details.summary || [details.title, details.code, ...(details.specs || []).map((spec) => `${spec.label}: ${spec.value}`)])
    .filter(Boolean)
    .join(' · ')
    .slice(0, 600);
}

function errorMessageKey(error) {
  if (error?.status === 0) {
    return 'contact.errors.network';
  }

  if (error?.status === 429) {
    return 'contact.errors.rateLimited';
  }

  if (error?.status === 400) {
    return 'contact.errors.validation';
  }

  return 'contact.errors.generic';
}

/*
  "Project details" quote form, shown as a dialog over the current page.
  Opened from the header "Request a quote" button and other quote links.
*/
export default function QuoteModal() {
  const { t, i18n } = useTranslation();
  const localizedProducts = useProducts();
  const {
    open, product, details, mode, closeQuote, clearProduct,
    cart, addToCart, removeFromCart, setCartQuantity, clearCart, openCart,
  } = useQuote();
  const cartMode = mode === 'cart';

  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);

  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle');
  const [feedbackKey, setFeedbackKey] = useState('');

  // Fresh feedback each time; preselect the product the dialog was opened for
  useEffect(() => {
    if (!open) {
      return;
    }

    setStatus('idle');
    setFeedbackKey('');

    track('quote_form_open', { product: product || '(none)' });

    if (product) {
      setForm((current) => ({
        ...current,
        product,
        // A catalogue model also fills the capacity, unless the visitor typed one
        capacity: details?.capacity && !current.capacity ? details.capacity : current.capacity,
      }));
    }
  }, [open, product, details]);

  function removeProduct() {
    clearProduct();
    setForm((current) => ({
      ...current,
      product: '',
      capacity: details?.capacity && current.capacity === details.capacity ? '' : current.capacity,
    }));
  }

  const productDetails = summaryOf(details);

  // "Add another product": keep this model in the cart and let the visitor pick more
  function moveToCart() {
    if (details) {
      addToCart(details, form.quantity || 1);
    }
    clearProduct();
    setForm((current) => ({ ...current, product: '', capacity: '', quantity: '' }));
    closeQuote();
  }

  const productInList =
    !form.product ||
    form.product === 'Custom Requirement' ||
    localizedProducts.some((item) => item.quoteName === form.product);

  // Scroll lock, Escape to close, focus handling
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => firstFieldRef.current?.focus(), 60);

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeQuote();
        return;
      }

      // Keep keyboard focus inside the dialog
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input, select, textarea'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [open, closeQuote]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setStatus('loading');
    setFeedbackKey('');

    if (cartMode && cart.length === 0) {
      setStatus('error');
      setFeedbackKey('quoteCart.empty');
      return;
    }

    const cartFields = cartMode
      ? {
          product: `${cart.length} ${t('quoteCart.products')}: ${cart.map((item) => item.code || item.name).join(', ')}`.slice(0, 150),
          capacity: '',
          quantity: '',
          items: cart.map((item) => ({
            name: item.name,
            details: summaryOf(item),
            image: item.image || '',
            quantity: item.quantity || 1,
          })),
        }
      : {};

    try {
      await submitQuote({
        ...form,
        ...cartFields,
        productDetails: !cartMode && details && form.product === details.name ? productDetails : '',
        productImage: !cartMode && details && form.product === details.name ? details.image || '' : '',
        language: i18n.resolvedLanguage,
      });

      setStatus('success');
      setFeedbackKey('contact.success');

      // Conversion for GA4 / Google Ads / Meta (configured in GTM)
      track('generate_lead', {
        form_name: 'quote',
        product: form.product || '(none)',
        country: form.country || '(not set)',
        site_language: i18n.resolvedLanguage,
      });
      setForm(initialForm);
      clearProduct();
      if (cartMode) clearCart();
    } catch (error) {
      setStatus('error');
      setFeedbackKey(errorMessageKey(error));
    }
  }

  const fieldLabel = (name, required = false) =>
    `${t(`contact.fields.${name}`)}${required ? ' *' : ''}`;

  return (
    <div
      className={`quoteModal ${open ? 'open' : ''}`}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="quoteModalBackdrop" onClick={closeQuote} />

      <div
        className="quoteModalDialog"
        role="dialog"
        data-track-area="quote_dialog"
        aria-modal="true"
        aria-labelledby="quote-modal-title"
        ref={dialogRef}
      >

        <button
          type="button"
          className="quoteModalClose"
          onClick={closeQuote}
          aria-label={t('contact.close')}
        >
          <X aria-hidden="true" />
        </button>

        <aside className="quoteModalAside">

          <p className="eyebrow">
            {t('contact.formEyebrow')}
          </p>

          <h2 id="quote-modal-title">
            {t('contact.formTitle')}
            <span>{t('contact.formTitleAccent')}</span>
          </h2>

          <p>
            {t('contact.formText')}
          </p>

          <ul className="quoteModalContacts">
            <li>
              <Phone aria-hidden="true" />
              <a href={company.phone.href} dir="ltr">
                {company.phone.display}
              </a>
            </li>

            <li>
              <Mail aria-hidden="true" />
              <a href={`mailto:${company.email}`} dir="ltr">
                {company.email}
              </a>
            </li>

            <li>
              <MapPin aria-hidden="true" />
              <span>
                {company.address.street}
                <br />
                {company.address.district}, {company.address.country}
              </span>
            </li>
          </ul>

        </aside>

        <form
          className="quoteForm quoteModalForm"
          onSubmit={handleSubmit}
        >

          {cartMode && (
            <div className="quoteCartList">
              <div className="quoteCartHead">
                <span className="quoteProductLabel">
                  <ShoppingBag aria-hidden="true" />
                  {t('quoteCart.itemsTitle', { count: cart.length })}
                </span>
                {cart.length > 0 && (
                  <button type="button" className="quoteCartClear" onClick={clearCart}>{t('quoteCart.clear')}</button>
                )}
              </div>

              {cart.length === 0 && status !== 'success' && <p className="quoteCartEmpty">{t('quoteCart.empty')}</p>}

              <ul>
                {cart.map((item) => (
                  <li key={item.name} className="quoteCartItem">
                    <span className="quoteProductImage small">
                      {item.image ? <img src={item.image} alt="" /> : <Package aria-hidden="true" />}
                    </span>

                    <span className="quoteCartItemText">
                      <strong>
                        {item.code || item.name}
                        {item.capacity && <em>{item.capacity}</em>}
                      </strong>
                      {item.title && <small>{item.title}</small>}
                    </span>

                    <span className="quoteQty" aria-label={t('quoteCart.quantity')}>
                      <button type="button" onClick={() => setCartQuantity(item.name, (item.quantity || 1) - 1)} aria-label="−" disabled={(item.quantity || 1) <= 1}>
                        <Minus aria-hidden="true" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity || 1}
                        onChange={(event) => setCartQuantity(item.name, event.target.value)}
                        aria-label={`${item.code || item.name} – ${t('quoteCart.quantity')}`}
                      />
                      <button type="button" onClick={() => setCartQuantity(item.name, (item.quantity || 1) + 1)} aria-label="+">
                        <Plus aria-hidden="true" />
                      </button>
                    </span>

                    <button type="button" className="quoteProductRemove inline" onClick={() => removeFromCart(item.name)} aria-label={t('contact.removeProduct')}>
                      <X aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!cartMode && cart.length > 0 && (
            <button type="button" className="quoteCartNotice" onClick={openCart}>
              <ShoppingBag aria-hidden="true" />
              {t('quoteCart.notice', { count: cart.length })}
            </button>
          )}

          {!cartMode && details && form.product === details.name && (
            <div className="quoteProduct">
              <span className="quoteProductImage">
                {details.image ? (
                  <img src={details.image} alt={details.code || details.name} />
                ) : (
                  <Package aria-hidden="true" />
                )}
              </span>

              <div className="quoteProductText">
                <span className="quoteProductLabel">{t('contact.selectedProduct')}</span>
                <strong>
                  {details.code || details.name}
                  {details.capacity && <em>{details.capacity}</em>}
                </strong>
                {details.title && <span className="quoteProductFamily">{details.title}</span>}

                {details.specs?.length > 0 && (
                  <dl>
                    {details.specs.map((spec) => (
                      <div key={spec.label}>
                        <dt>{spec.label}</dt>
                        <dd>{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {details.code && (
                  <button type="button" className="quoteMoreProducts" onClick={moveToCart}>
                    <Plus aria-hidden="true" />
                    {t('quoteCart.addAnother')}
                  </button>
                )}
              </div>

              <button
                type="button"
                className="quoteProductRemove"
                onClick={removeProduct}
                aria-label={t('contact.removeProduct')}
                title={t('contact.removeProduct')}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="formGrid">

            <label className="formField">
              <span>{fieldLabel('company', true)}</span>
              <input
                ref={firstFieldRef}
                type="text"
                name="company"
                maxLength={150}
                value={form.company}
                onChange={handleChange}
                required
                placeholder={t('contact.placeholders.company')}
              />
            </label>

            <label className="formField">
              <span>{fieldLabel('name', true)}</span>
              <input
                type="text"
                name="name"
                maxLength={120}
                value={form.name}
                onChange={handleChange}
                required
                placeholder={t('contact.placeholders.name')}
              />
            </label>

            <label className="formField">
              <span>{fieldLabel('email', true)}</span>
              <input
                type="email"
                name="email"
                dir="ltr"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder={t('contact.placeholders.email')}
              />
            </label>

            <label className="formField">
              <span>{fieldLabel('phone')}</span>
              <input
                type="tel"
                name="phone"
                dir="ltr"
                maxLength={40}
                value={form.phone}
                onChange={handleChange}
                placeholder={t('contact.placeholders.phone')}
              />
            </label>

            <label className="formField">
              <span>{fieldLabel('country')}</span>
              <input
                type="text"
                name="country"
                maxLength={80}
                value={form.country}
                onChange={handleChange}
                placeholder={t('contact.placeholders.country')}
              />
            </label>

            {!cartMode && (
            <label className="formField">
              <span>{fieldLabel('product')}</span>
              <select
                name="product"
                value={form.product}
                onChange={handleChange}
              >
                <option value="">
                  {t('contact.placeholders.product')}
                </option>

                {!productInList && (
                  <option value={form.product}>
                    {details?.code ? `${details.code}${details.title ? ` – ${details.title}` : ''}` : form.product}
                  </option>
                )}

                {localizedProducts.map((item) => (
                  <option key={item.slug} value={item.quoteName}>
                    {item.name}
                  </option>
                ))}

                <option value="Custom Requirement">
                  {t('contact.customRequirement')}
                </option>
              </select>
            </label>

            )}

            {!cartMode && (
            <label className="formField">
              <span>{fieldLabel('capacity')}</span>
              <input
                type="text"
                name="capacity"
                maxLength={80}
                value={form.capacity}
                onChange={handleChange}
                placeholder={t('contact.placeholders.capacity')}
              />
            </label>

            )}

            {!cartMode && (
            <label className="formField">
              <span>{fieldLabel('quantity')}</span>
              <input
                type="number"
                min="1"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                placeholder={t('contact.placeholders.quantity')}
              />
            </label>
            )}

            <label className="formField formFieldFull">
              <span>{fieldLabel('application')}</span>
              <input
                type="text"
                name="application"
                maxLength={200}
                value={form.application}
                onChange={handleChange}
                placeholder={t('contact.placeholders.application')}
              />
            </label>

            <label className="formField formFieldFull">
              <span>{fieldLabel('message', true)}</span>
              <textarea
                name="message"
                maxLength={5000}
                value={form.message}
                onChange={handleChange}
                required
                rows="5"
                placeholder={t('contact.placeholders.message')}
              />
            </label>

          </div>

          <div className="quoteFormBottom">

            <p>
              {t('contact.consent')}
            </p>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="quoteSubmit"
            >
              <span>
                {status === 'loading'
                  ? t('contact.sending')
                  : t('contact.submit')}
              </span>

              <Arrow />
            </button>

          </div>

          {feedbackKey && (
            <div
              className={`quoteFeedback ${status}`}
              role={status === 'error' ? 'alert' : 'status'}
            >
              {t(feedbackKey)}
            </div>
          )}

        </form>

      </div>
    </div>
  );
}
