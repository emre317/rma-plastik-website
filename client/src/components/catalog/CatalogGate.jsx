import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Check, FileDown, X } from 'lucide-react';

import { CATALOG_PDF } from '../ui/CatalogLink';
import Dropdown from '../ui/Dropdown';
import { countryNameTr, countryOptions } from '../../data/countries';
import { submitCatalogLead } from '../../services/api';
import { visitAttribution } from '../../analytics/attribution';
import { track } from '../../analytics/track';

/*
  Catalogue download in exchange for an e-mail address. Every link to the
  catalogue PDF on the site opens this form first; after sending it the
  download starts, and the visitor appears in the admin panel
  (Potansiyel Müşteriler). Later clicks download directly.
  The PDF itself stays a normal public file (search engines, old links).
*/

const DONE_KEY = 'rma_catalog_lead';
const FILE_NAME = CATALOG_PDF.split('/').pop();

function alreadySent() {
  try {
    return Boolean(localStorage.getItem(DONE_KEY));
  } catch {
    return false;
  }
}

function rememberSent() {
  try {
    localStorage.setItem(DONE_KEY, String(Date.now()));
  } catch {
    // Storage blocked: the form is shown again next time
  }
}

function startDownload() {
  const link = document.createElement('a');
  link.href = CATALOG_PDF;
  link.download = FILE_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const emptyForm = { email: '', name: '', company: '', country: '', marketingConsent: false, website: '' };

export default function CatalogGate() {
  const { t, i18n } = useTranslation();
  const c = (key, options) => t(`catalogGate.${key}`, options);

  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('idle');
  const dialogRef = useRef(null);

  const countries = useMemo(
    () => countryOptions(i18n.resolvedLanguage || 'tr').map((item) => ({ value: item.code, label: item.name })),
    [i18n.resolvedLanguage]
  );

  // Any link to the catalogue PDF opens the form until it has been sent once
  useEffect(() => {
    function onClick(event) {
      const link = event.target.closest?.('a[href]');
      if (!link || !link.getAttribute('href').endsWith(FILE_NAME) || link.dataset.direct !== undefined) return;

      const where = link.dataset.placement || link.closest('[data-placement]')?.dataset.placement || link.closest('footer, header, section')?.className.split(' ')[0] || 'page';

      if (alreadySent()) {
        track('file_download', { file_name: FILE_NAME, placement: where });
        return;
      }

      event.preventDefault();
      setPlacement(where);
      setStatus('idle');
      setOpen(true);
      track('catalog_form_open', { placement: where });
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Scroll lock, Escape, focus inside the dialog
  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => dialogRef.current?.querySelector('input[name="email"]')?.focus(), 60);

    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);

      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([tabindex="-1"]), select, textarea')]
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

    window.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      previousFocus?.focus?.();
    };
  }, [open]);

  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  async function submit(event) {
    event.preventDefault();
    if (status === 'loading') return;

    setStatus('loading');

    try {
      await submitCatalogLead({
        ...form,
        country: form.country ? countryNameTr(form.country) : '',
        language: i18n.resolvedLanguage,
        attribution: visitAttribution(),
      });

      rememberSent();
      setStatus('success');
      startDownload();

      // Conversion for GA4 / Google Ads / Meta (configured in GTM)
      track('generate_lead', { form_name: 'catalog', placement, country: form.country || '(not set)', site_language: i18n.resolvedLanguage });
      track('file_download', { file_name: FILE_NAME, placement });
      setForm(emptyForm);
    } catch (error) {
      setStatus(error?.status === 400 ? 'invalid' : 'error');
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="catalogGate" role="dialog" aria-modal="true" aria-labelledby="catalog-gate-title">
      <div className="catalogGateBackdrop" onClick={() => setOpen(false)} />

      <div className="catalogGateDialog" ref={dialogRef}>
        <button type="button" className="catalogGateClose" onClick={() => setOpen(false)} aria-label={t('contact.close')}>
          <X aria-hidden="true" />
        </button>

        <div className="catalogGateCover" aria-hidden="true">
          <span className="catalogGateBook">
            <FileDown />
            <strong>RMA Plastik</strong>
            <small>{c('coverLabel')}</small>
          </span>
        </div>

        {status === 'success' ? (
          <div className="catalogGateBody catalogGateDone" role="status">
            <span className="catalogGateTick" aria-hidden="true"><Check /></span>
            <h2 id="catalog-gate-title">{c('successTitle')}</h2>
            <p>{c('successText')}</p>
            <a href={CATALOG_PDF} download data-direct="" className="button primary">
              <span>{c('downloadAgain')}</span>
              <FileDown aria-hidden="true" className="buttonIcon" />
            </a>
            <button type="button" className="catalogGateText" onClick={() => setOpen(false)}>{t('contact.close')}</button>
          </div>
        ) : (
          <form className="catalogGateBody" onSubmit={submit}>
            <span className="catalogGateEyebrow">{t('common.catalogMeta')}</span>
            <h2 id="catalog-gate-title">{c('title')}</h2>
            <p>{c('text')}</p>

            <label className="catalogGateField">
              <span>{c('email')} *</span>
              <input
                type="email"
                name="email"
                required
                maxLength={254}
                autoComplete="email"
                inputMode="email"
                dir="ltr"
                value={form.email}
                onChange={(event) => set('email', event.target.value)}
              />
            </label>

            <div className="catalogGateRow">
              <label className="catalogGateField">
                <span>{c('name')}</span>
                <input name="name" maxLength={120} autoComplete="name" value={form.name} onChange={(event) => set('name', event.target.value)} />
              </label>
              <label className="catalogGateField">
                <span>{c('company')}</span>
                <input name="company" maxLength={150} autoComplete="organization" value={form.company} onChange={(event) => set('company', event.target.value)} />
              </label>
            </div>

            <div className="catalogGateField">
              <span id="catalog-gate-country">{c('country')}</span>
              <Dropdown
                value={form.country}
                onChange={(value) => set('country', value)}
                options={countries}
                placeholder={t('contact.placeholders.countrySelect')}
                label={c('country')}
                searchable
                searchPlaceholder={t('contact.placeholders.countrySearch')}
              />
            </div>

            {/* Spam trap: hidden from people */}
            <input className="catalogGateTrap" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => set('website', event.target.value)} aria-hidden="true" />

            <label className="catalogGateCheck">
              <input type="checkbox" checked={form.marketingConsent} onChange={(event) => set('marketingConsent', event.target.checked)} />
              <span>{c('marketing')}</span>
            </label>

            {(status === 'error' || status === 'invalid') && (
              <p className="catalogGateError" role="alert">
                {status === 'invalid' ? c('invalid') : c('error')}
                {status === 'error' && (
                  <> <a href={CATALOG_PDF} download data-direct="">{c('directLink')}</a></>
                )}
              </p>
            )}

            <button type="submit" className="button primary catalogGateSubmit" disabled={status === 'loading'}>
              <span>{status === 'loading' ? t('contact.sending') : c('submit')}</span>
              <FileDown aria-hidden="true" className="buttonIcon" />
            </button>

            <small className="catalogGatePrivacy">{c('privacy')}</small>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
