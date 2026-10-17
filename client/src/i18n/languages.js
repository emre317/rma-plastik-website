export const SUPPORTED_LANGUAGES = [
  {
    code: 'tr',
    label: 'Türkçe',
    short: 'TR',
    dir: 'ltr',
    flag: 'tr',
  },
  {
    code: 'en',
    label: 'English',
    short: 'EN',
    dir: 'ltr',
    flag: 'gb',
  },
  {
    code: 'ar',
    label: 'العربية',
    short: 'AR',
    dir: 'rtl',
    flag: 'ae',
  },
];

export const DEFAULT_LANGUAGE = 'tr';

// Earlier versions remembered the last language here; it is no longer used
const OLD_STORAGE_KEY = 'rma_language';

if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem(OLD_STORAGE_KEY);
  } catch {
    // Storage unavailable
  }
}

const codes = SUPPORTED_LANGUAGES.map((language) => language.code);

export function isSupportedLanguage(code) {
  return codes.includes(code);
}

export function getLanguage(code) {
  return (
    SUPPORTED_LANGUAGES.find((language) => language.code === code) ||
    SUPPORTED_LANGUAGES.find((language) => language.code === DEFAULT_LANGUAGE)
  );
}

export function getLanguageFromPath(pathname) {
  const segment = pathname.split('/')[1];

  return isSupportedLanguage(segment) ? segment : null;
}

/*
  The site always opens in Turkish: the root address and links without a
  language prefix go to /tr. Another language is shown only when its URL
  (/en/…, /ar/…) is opened or picked from the switcher; it is not remembered.
*/
export function getPreferredLanguage() {
  return DEFAULT_LANGUAGE;
}

/* "/products" + "tr" -> "/tr/products" */
export function localizePath(path, code) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    return path;
  }

  return path === '/' ? `/${code}` : `/${code}${path}`;
}

/* "/tr/products?x#y" -> "/ar/products?x#y" */
export function switchPathLanguage(location, code) {
  const rest = location.pathname.replace(/^\/[^/]+/, '') || '';

  return `/${code}${rest}${location.search}${location.hash}`;
}
