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

const STORAGE_KEY = 'rma_language';

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

export function storeLanguage(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Storage unavailable — preference is simply not remembered
  }
}

/*
  Saved choice → Turkish.
  The site opens in Turkish for every new visitor; once someone picks a
  language from the switcher, that choice is remembered.
*/
export function getPreferredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (isSupportedLanguage(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }

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
