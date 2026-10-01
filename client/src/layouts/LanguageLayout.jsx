import { useEffect, useLayoutEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import PublicLayout from './PublicLayout';
import { applyDocumentLanguage } from '../i18n';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getLanguage,
  getPreferredLanguage,
  isSupportedLanguage,
  storeLanguage,
  switchPathLanguage,
} from '../i18n/languages';

function setHeadLink(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
}

/*
  Wraps every public page under /:lang.
  - Unknown prefixes (e.g. old "/products" links) redirect to the preferred language
  - Keeps i18next, <html lang/dir>, hreflang alternates and meta description in sync
*/
export default function LanguageLayout() {
  const { lang } = useParams();
  const location = useLocation();
  const { i18n, t } = useTranslation();

  const valid = isSupportedLanguage(lang);

  // Layout effect: switch language before paint so no mixed-language frame is shown
  useLayoutEffect(() => {
    if (!valid) {
      return;
    }

    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }

    applyDocumentLanguage(lang, getLanguage(lang).dir);
    storeLanguage(lang);
  }, [lang, valid, i18n]);

  useEffect(() => {
    if (!valid) {
      return;
    }

    const origin = window.location.origin;

    SUPPORTED_LANGUAGES.forEach(({ code }) => {
      setHeadLink(`link[rel="alternate"][hreflang="${code}"]`, {
        rel: 'alternate',
        hreflang: code,
        href: origin + switchPathLanguage({ ...location, search: '', hash: '' }, code),
      });
    });

    setHeadLink('link[rel="alternate"][hreflang="x-default"]', {
      rel: 'alternate',
      hreflang: 'x-default',
      href:
        origin +
        switchPathLanguage({ ...location, search: '', hash: '' }, DEFAULT_LANGUAGE),
    });

    setHeadLink('link[rel="canonical"]', {
      rel: 'canonical',
      href: origin + location.pathname,
    });

    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('meta.description'));
  }, [valid, location, t, lang]);

  if (!valid) {
    return (
      <Navigate
        to={`/${getPreferredLanguage()}${location.pathname}${location.search}${location.hash}`}
        replace
      />
    );
  }

  return <PublicLayout />;
}
