import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check, Link2, Mail, MapPin, Send, Minus, Package, Phone, Plus, Search, Share2, ShoppingBag, Sun, Trash2, X,
} from 'lucide-react';

import Arrow from '../i18n/Arrow';
import Dropdown from '../ui/Dropdown';
import company from '../../data/company';
import portfolio from '../../data/productPortfolio';
import useModelQuote from '../../hooks/useModelQuote';
import useQuoteShare from '../../hooks/useQuoteShare';
import { countryNameTr, countryOptions } from '../../data/countries';
import { submitQuote } from '../../services/api';
import { visitAttribution } from '../../analytics/attribution';
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

const PAGE = 24;

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
  if (error?.status === 0) return 'contact.errors.network';
  if (error?.status === 429) return 'contact.errors.rateLimited';
  if (error?.status === 400) return 'contact.errors.validation';
  return 'contact.errors.generic';
}

const normalise = (value) => String(value).toLocaleLowerCase('tr').replace(/[\s.,-]/g, '');

/*
  Quote request dialog: the product list (picked from the catalogue inside the
  dialog, or added on product pages) on one side, contact details on the other.
  Phones switch between the two panels with tabs.
*/
export default function QuoteModal() {
  const { t, i18n } = useTranslation();
  const trT = i18n.getFixedT('tr');
  const quoteForModel = useModelQuote();
  const {
    open, product, shared, closeQuote, clearProduct,
    cart, addToCart, removeFromCart, setCartQuantity, clearCart,
  } = useQuote();
  const { shareUrl } = useQuoteShare();
  const [shareNote, setShareNote] = useState('');

  const dialogRef = useRef(null);
  const searchRef = useRef(null);

  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle');
  const [feedbackKey, setFeedbackKey] = useState('');
  const [sent, setSent] = useState(null);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [limit, setLimit] = useState(PAGE);
  const [picker, setPicker] = useState(false);
  const pickerRef = useRef(false);
  const deferredQuery = useDeferredValue(query);

  const q = (key, options) => t(`quoteCart.${key}`, options);

  // Share the list: the phone's share sheet, otherwise the link is copied
  async function shareList() {
    const url = shareUrl(cart);
    if (!url) return;

    track('quote_list_share', { items: cart.length, method: navigator.share ? 'native' : 'copy' });

    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: q('shareTitle'), text: q('shareText'), url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareNote(q('shareCopied'));
    } catch {
      window.prompt(q('shareCopyPrompt'), url);
    }

    setTimeout(() => setShareNote(''), 2600);
  }

  function emailList() {
    const url = shareUrl(cart);
    if (!url) return;

    const lines = cart.map((item) => `• ${[item.code || item.name, item.title, item.capacity].filter(Boolean).join(' · ')} × ${item.quantity || 1}`);
    const body = [q('shareText'), '', ...lines, '', url].join('\n');

    track('quote_list_share', { items: cart.length, method: 'email' });
    window.location.href = `mailto:?subject=${encodeURIComponent(q('shareTitle'))}&body=${encodeURIComponent(body)}`;
  }

  // Product groups for the subject field; the Turkish title is sent so the
  // sales team always sees the same name whatever the site language
  const productOptions = portfolio.map((item) => ({
    id: item.id,
    value: trT(`productExplorer.items.${item.id}.title`),
    label: t(`productExplorer.items.${item.id}.title`),
  }));

  const countries = useMemo(() => countryOptions(i18n.resolvedLanguage || 'tr'), [i18n.resolvedLanguage]);

  const pickerGroups = portfolio.filter((item) => !item.custom && item.models > 0);

  // Every catalogue model, ready for the list
  const catalogue = useMemo(
    () => portfolio.flatMap((item) =>
      item.members.flatMap((family) =>
        family.rows.map((row) => ({
          group: item.id,
          search: normalise(`${row.code} ${row.volume ?? ''}`),
          model: quoteForModel(family, row),
        }))
      )
    ),
    [quoteForModel]
  );

  const results = useMemo(() => {
    const needle = normalise(deferredQuery.replace(/\s*l(itre)?$/i, ''));

    return catalogue.filter(
      (entry) => (group === 'all' || entry.group === group) && (!needle || entry.search.includes(needle))
    );
  }, [catalogue, deferredQuery, group]);

  // Fresh state each time the dialog opens
  useEffect(() => {
    if (!open) return;

    setStatus('idle');
    setSent(null);
    setFeedbackKey('');
    setLimit(PAGE);
    setPicker(false);
    track('quote_form_open', { product: product || '(none)' });

    if (product) {
      setForm((current) => ({ ...current, product }));
    }
  }, [open, product]);

  useEffect(() => setLimit(PAGE), [deferredQuery, group]);

  // Focus the search when the catalogue picker opens
  useEffect(() => {
    pickerRef.current = picker;
    if (picker) setTimeout(() => searchRef.current?.focus(), 80);
  }, [picker]);

  // Scroll lock, Escape to close, focus handling
  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => dialogRef.current?.querySelector('.qmClose')?.focus(), 60);

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        // The catalogue picker closes first
        if (pickerRef.current) {
          setPicker(false);
          return;
        }
        closeQuote();
        return;
      }

      // Keep keyboard focus inside the dialog
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll('a[href], button:not([disabled]), input, select, textarea')]
          .filter((element) => element.offsetParent !== null);
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
    setForm((current) => ({ ...current, [name]: value }));
  }

  const inList = (name) => cart.some((item) => item.name === name);
  const toggle = (model) => (inList(model.name) ? removeFromCart(model.name) : addToCart(model));
  const totalPieces = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  async function handleSubmit(event) {
    event.preventDefault();

    setStatus('loading');
    setFeedbackKey('');

    const single = cart.length === 1 ? cart[0] : null;
    const listFields = cart.length
      ? {
          product: single
            ? single.name.slice(0, 150)
            : `${cart.length} ${q('products')}: ${cart.map((item) => item.code || item.name).join(', ')}`.slice(0, 150),
          capacity: single?.capacity || '',
          quantity: single ? String(single.quantity || 1) : '',
          productDetails: single ? summaryOf(single) : '',
          productImage: single?.image || '',
          items: cart.map((item) => ({
            name: item.name,
            details: summaryOf(item),
            image: item.image || '',
            quantity: item.quantity || 1,
          })),
        }
      : {};

    try {
      const response = await submitQuote({
        ...form,
        country: form.country ? countryNameTr(form.country) : '',
        ...listFields,
        language: i18n.resolvedLanguage,
        attribution: visitAttribution(),
      });

      setStatus('success');
      setSent({
        company: form.company,
        email: form.email,
        reference: response?.reference || '',
        confirmation: Boolean(response?.confirmation),
        items: cart.map((item) => ({ name: item.code || item.name, quantity: item.quantity || 1, image: item.image })),
        subject: listFields.product ? '' : form.product,
      });

      // Conversion for GA4 / Google Ads / Meta (configured in GTM)
      track('generate_lead', {
        form_name: 'quote',
        product: listFields.product || form.product || '(none)',
        items: cart.length,
        country: form.country || '(not set)',
        site_language: i18n.resolvedLanguage,
      });

      setForm(initialForm);
      clearProduct();
      clearCart();
    } catch (error) {
      setStatus('error');
      setFeedbackKey(errorMessageKey(error));
    }
  }

  const fieldLabel = (name, required = false) => `${t(`contact.fields.${name}`)}${required ? ' *' : ''}`;
  const subjectInList = !form.product || form.product === 'Custom Requirement' || productOptions.some((item) => item.value === form.product);

  return (
    <div className={`quoteModal qm ${open ? 'open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="quoteModalBackdrop" onClick={closeQuote} />

      <div
        className="qmDialog qmClassic"
        role="dialog"
        data-track-area="quote_dialog"
        aria-modal="true"
        aria-labelledby="quote-modal-title"
        ref={dialogRef}
      >
        <button type="button" className="qmClose" onClick={closeQuote} aria-label={t('contact.close')}>
          <X aria-hidden="true" />
        </button>

        <aside className="qmAside">
          <p className="eyebrow">{t('contact.formEyebrow')}</p>
          <h2 id="quote-modal-title">
            {t('contact.formTitle')}
            <span>{t('contact.formTitleAccent')}</span>
          </h2>
          <p>{t('contact.formText')}</p>

          <ul className="qmAsideContacts">
            <li><Phone aria-hidden="true" /><a href={company.phone.href} dir="ltr">{company.phone.display}</a></li>
            <li><Mail aria-hidden="true" /><a href={`mailto:${company.email}`} dir="ltr">{company.email}</a></li>
            <li><MapPin aria-hidden="true" /><span>{company.address.street}<br />{company.address.district}, {company.address.country}</span></li>
          </ul>

          <p className="qmSolar"><Sun aria-hidden="true" />{q('solarNote')}</p>
        </aside>

        {status === 'success' && sent ? (
          <div className="qmForm qmSuccess" role="status">
            <span className="qmSuccessIcon" aria-hidden="true">
              <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg>
            </span>
            <h3>{t('contact.successTitle')}</h3>
            <p>{t('contact.successText', { email: sent.email })}</p>

            {sent.reference && (
              <p className="qmReference">
                <span>{t('contact.successReference')}</span>
                <strong dir="ltr">{sent.reference}</strong>
              </p>
            )}
            {sent.confirmation && <p className="qmMailNote"><Mail aria-hidden="true" />{t('contact.successMail', { email: sent.email })}</p>}

            <div className="qmSuccessSummary">
              <span>{t('contact.successSummary')}</span>
              <strong>{sent.company}</strong>
              {sent.items.length > 0 ? (
                <ul>
                  {sent.items.map((item) => (
                    <li key={item.name}>
                      {item.image && <img src={item.image} alt="" />}
                      <span>{item.name}</span>
                      <em>× {item.quantity}</em>
                    </li>
                  ))}
                </ul>
              ) : (
                sent.subject && <small>{sent.subject === 'Custom Requirement' ? t('contact.customRequirement') : sent.subject}</small>
              )}
            </div>

            <ol className="qmNextSteps">
              <li><Check aria-hidden="true" />{t('contact.successStep1')}</li>
              <li><Mail aria-hidden="true" />{t('contact.successStep2')}</li>
              <li><Phone aria-hidden="true" />{t('contact.successStep3')}</li>
            </ol>

            <div className="qmSuccessActions">
              <button type="button" className="qmNext" onClick={closeQuote}>{t('contact.close')}</button>
              <button type="button" className="qmTextButton" onClick={() => { setStatus('idle'); setSent(null); }}>
                <Plus aria-hidden="true" />
                {t('contact.successNew')}
              </button>
            </div>
          </div>
        ) : (
        <form className="qmForm quoteForm" onSubmit={handleSubmit}>
          {/* Products: picked from the catalogue (or added on product pages) */}
          <div className="qmSelected">
            <div className="qmSectionHead">
              <h3>
                <ShoppingBag aria-hidden="true" />
                {q('selectedTitle')}
                {cart.length > 0 && <span className="qmCount">{cart.length}</span>}
              </h3>
              <div className="qmSectionActions">
                {cart.length > 0 && (
                  <button type="button" className="qmTextButton" onClick={clearCart}>
                    <Trash2 aria-hidden="true" />
                    {q('clear')}
                  </button>
                )}
                <button type="button" className="qmPickButton" onClick={() => setPicker(true)}>
                  <Plus aria-hidden="true" />
                  {q('pickFromCatalog')}
                </button>
              </div>
            </div>

            {shared > 0 && (
              <p className="qmSharedNote" role="status"><Link2 aria-hidden="true" />{q('sharedOpened', { count: shared })}</p>
            )}

            {cart.length === 0 ? (
              <p className="qmEmpty">{q('emptySelected')}</p>
            ) : (
              <ul className="qmSelectedList">
                {cart.map((item) => (
                  <li key={item.name}>
                    <span className="qmThumb">
                      {item.image ? <img src={item.image} alt="" /> : <Package aria-hidden="true" />}
                    </span>
                    <span className="qmItemText">
                      <strong>{item.code || item.name}</strong>
                      <small>{[item.title, item.capacity].filter(Boolean).join(' · ')}</small>
                    </span>
                    <span className="qmQty" aria-label={q('quantity')}>
                      <button type="button" onClick={() => setCartQuantity(item.name, (item.quantity || 1) - 1)} aria-label="−" disabled={(item.quantity || 1) <= 1}>
                        <Minus aria-hidden="true" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity || 1}
                        onChange={(event) => setCartQuantity(item.name, event.target.value)}
                        aria-label={`${item.code || item.name} – ${q('quantity')}`}
                      />
                      <button type="button" onClick={() => setCartQuantity(item.name, (item.quantity || 1) + 1)} aria-label="+">
                        <Plus aria-hidden="true" />
                      </button>
                    </span>
                    <button type="button" className="qmRemove" onClick={() => removeFromCart(item.name)} aria-label={t('contact.removeProduct')}>
                      <X aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {cart.length > 0 && (
              <div className="qmShare">
                <span>{q('shareLabel')}</span>
                <button type="button" className="qmTextButton" onClick={shareList}>
                  <Share2 aria-hidden="true" />
                  {q('share')}
                </button>
                <button type="button" className="qmTextButton" onClick={emailList}>
                  <Mail aria-hidden="true" />
                  {q('shareEmail')}
                </button>
                {shareNote && <span className="qmShareNote" role="status"><Check aria-hidden="true" />{shareNote}</span>}
              </div>
            )}
          </div>

          <div className="formGrid">
            <label className="formField">
              <span>{fieldLabel('company', true)}</span>
              <input type="text" name="company" maxLength={150} value={form.company} onChange={handleChange} required placeholder={t('contact.placeholders.company')} />
            </label>

            <label className="formField">
              <span>{fieldLabel('name', true)}</span>
              <input type="text" name="name" maxLength={120} value={form.name} onChange={handleChange} required placeholder={t('contact.placeholders.name')} />
            </label>

            <label className="formField">
              <span>{fieldLabel('email', true)}</span>
              <input type="email" name="email" dir="ltr" autoComplete="email" value={form.email} onChange={handleChange} required placeholder={t('contact.placeholders.email')} />
            </label>

            <label className="formField">
              <span>{fieldLabel('phone')}</span>
              <input type="tel" name="phone" dir="ltr" maxLength={40} value={form.phone} onChange={handleChange} placeholder={t('contact.placeholders.phone')} />
            </label>

            <div className="formField">
              <span>{fieldLabel('country')}</span>
              <Dropdown
                name="country"
                value={form.country}
                onChange={(value) => handleChange({ target: { name: 'country', value } })}
                options={countries.map((item) => ({ value: item.code, label: item.name }))}
                placeholder={t('contact.placeholders.countrySelect')}
                label={fieldLabel('country')}
                searchable
                searchPlaceholder={t('contact.placeholders.countrySearch')}
              />
            </div>

            {cart.length === 0 && (
              <div className="formField">
                <span>{fieldLabel('product')}</span>
                <Dropdown
                  name="product"
                  value={form.product}
                  onChange={(value) => handleChange({ target: { name: 'product', value } })}
                  options={[
                    { value: '', label: t('contact.placeholders.product') },
                    ...(!subjectInList ? [{ value: form.product, label: form.product }] : []),
                    ...productOptions.map((item) => ({ value: item.value, label: item.label })),
                    { value: 'Custom Requirement', label: t('contact.customRequirement') },
                  ]}
                  placeholder={t('contact.placeholders.product')}
                  label={fieldLabel('product')}
                />
              </div>
            )}

            {cart.length === 0 && (
              <label className="formField">
                <span>{fieldLabel('capacity')}</span>
                <input type="text" name="capacity" maxLength={80} value={form.capacity} onChange={handleChange} placeholder={t('contact.placeholders.capacity')} />
              </label>
            )}

            {cart.length === 0 && (
              <label className="formField">
                <span>{fieldLabel('quantity')}</span>
                <input type="number" min="1" name="quantity" value={form.quantity} onChange={handleChange} placeholder={t('contact.placeholders.quantity')} />
              </label>
            )}

            <label className="formField formFieldFull">
              <span>{fieldLabel('application')}</span>
              <input type="text" name="application" maxLength={200} value={form.application} onChange={handleChange} placeholder={t('contact.placeholders.application')} />
            </label>

            <label className="formField formFieldFull">
              <span>{fieldLabel('message', true)}</span>
              <textarea name="message" maxLength={5000} value={form.message} onChange={handleChange} required rows="4" placeholder={t('contact.placeholders.message')} />
            </label>
          </div>

          {feedbackKey && (
            <div className={`quoteFeedback ${status}`} role={status === 'error' ? 'alert' : 'status'}>
              {t(feedbackKey)}
            </div>
          )}

          <div className="qmSubmitRow">
            <p>{t('contact.consent')}</p>
            <button type="submit" disabled={status === 'loading'} className="qmSubmit">
              {status === 'loading' ? <span className="qmSpinner" aria-hidden="true" /> : <Send aria-hidden="true" />}
              <span>{status === 'loading' ? t('contact.sending') : t('contact.submit')}</span>
            </button>
          </div>

        </form>
        )}

        {/* Catalogue picker, opened with "Katalogdan seç" */}
        <div className={`qmPicker ${picker ? 'open' : ''}`} role="dialog" aria-label={q('browseTitle')} aria-hidden={!picker} inert={!picker}>
          <div className="qmPickerHead">
            <h3>{q('browseTitle')}</h3>
            <span className="qmHint">{q('resultCount', { count: results.length })}</span>
            <button type="button" className="qmClose static" onClick={() => setPicker(false)} aria-label={q('done')}>
              <X aria-hidden="true" />
            </button>
          </div>

          <div className="qmPickerBody">
              <label className="qmSearch">
                <Search aria-hidden="true" />
                <span className="visuallyHidden">{q('search')}</span>
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  placeholder={q('searchPlaceholder')}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>

              <div className="qmChips" role="group" aria-label={q('groupsLabel')}>
                {[{ id: 'all' }, ...pickerGroups].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={group === item.id ? 'active' : ''}
                    aria-pressed={group === item.id}
                    onClick={() => setGroup(item.id)}
                  >
                    {item.id === 'all' ? q('allGroups') : t(`productExplorer.items.${item.id}.label`)}
                  </button>
                ))}
              </div>

              {results.length === 0 ? (
                <p className="qmEmpty">{q('noResults')}</p>
              ) : (
                <ul className="qmResults">
                  {results.slice(0, limit).map(({ model }) => {
                    const added = inList(model.name);

                    return (
                      <li key={model.name}>
                        <button type="button" className={`qmResult ${added ? 'added' : ''}`} onClick={() => toggle(model)} aria-pressed={added}>
                          <span className="qmThumb">
                            {model.image ? <img src={model.image} alt="" loading="lazy" decoding="async" /> : <Package aria-hidden="true" />}
                          </span>
                          <span className="qmItemText">
                            <strong>{model.code}</strong>
                            <small>{[model.title, model.capacity].filter(Boolean).join(' · ')}</small>
                          </span>
                          <span className="qmAdd">
                            {added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
                            {added ? q('addedItem') : q('addItem')}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {results.length > limit && (
                <button type="button" className="qmMore" onClick={() => setLimit((value) => value + PAGE)}>
                  {q('showMore', { count: results.length - limit })}
                </button>
              )}
          </div>

          <div className="qmPickerFoot">
            <span>{cart.length ? q('summary', { count: cart.length, total: totalPieces }) : q('noSelection')}</span>
            <button type="button" className="qmNext" onClick={() => setPicker(false)}>
              <Check aria-hidden="true" />
              {q('done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
