import { useTranslation } from 'react-i18next';

import { getLanguage } from '../i18n/languages';

/* Active language definition: { code, label, short, dir, flag }. */
export default function useLanguage() {
  const { i18n } = useTranslation();

  return getLanguage(i18n.resolvedLanguage || i18n.language);
}
