import { useLayoutEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import PublicLayout from './PublicLayout';
import { applyDocumentLanguage } from '../i18n';
import {
  getLanguage,
  getPreferredLanguage,
  isSupportedLanguage,
  storeLanguage,
} from '../i18n/languages';

/*
  Wraps every public page under /:lang.
  - Unknown prefixes (e.g. old "/products" links) redirect to the preferred language
  - Keeps i18next and <html lang/dir> in sync (page <head> tags: see seo/Seo.jsx)
*/
export default function LanguageLayout() {
  const { lang } = useParams();
  const location = useLocation();
  const { i18n } = useTranslation();

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
