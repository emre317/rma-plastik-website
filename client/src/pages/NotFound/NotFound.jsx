import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import Seo from '../../seo/Seo';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <main className="notFoundPage">
      <Seo title={t('meta.titles.notFound')} description={t('meta.descriptions.notFound')} noindex />

      <div className="container">

        <span className="eyebrow">
          {t('pages.notFound.eyebrow')}
        </span>

        <h1>
          {t('pages.notFound.title')}
          <span>{t('pages.notFound.titleAccent')}</span>
        </h1>

        <LocalizedLink to="/">
          {t('pages.notFound.home')} <Arrow />
        </LocalizedLink>

      </div>

    </main>
  );
}
