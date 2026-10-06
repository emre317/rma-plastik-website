import { useTranslation } from 'react-i18next';

import Seo from '../../seo/Seo';

export default function Industries() {
  const { t } = useTranslation();

  const meta = t('pages.industries.meta', { returnObjects: true });

  return (
    <main className="internalPage">
      <Seo title={t('meta.titles.industries')} description={t('meta.descriptions.industries')} breadcrumbs={[{ name: t('meta.titles.industries'), path: '/industries' }]} />

      <section className="internalHero">
        <div className="container">

          <div className="internalHeroMeta">
            <span>{meta[0]}</span>
            <span>{meta[1]}</span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              {t('pages.industries.eyebrow')}
            </p>

            <h1>
              {t('pages.industries.title')}
              <span>{t('pages.industries.titleAccent')}</span>
            </h1>

          </div>

        </div>
      </section>

    </main>
  );
}
