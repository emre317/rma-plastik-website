import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const SITE_NAME = 'RMA Plastik';

export default function usePageTitle(title) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = title
      ? `${title} | ${SITE_NAME}`
      : `${SITE_NAME} | ${t('meta.tagline')}`;
  }, [title, t, i18n.language]);
}
