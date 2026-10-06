import { useTranslation } from 'react-i18next';

import Seo from '../../seo/Seo';

export default function Engineering() {
  const { t } = useTranslation();

  const meta = t('pages.engineering.meta', { returnObjects: true });

  return (
    <main className="internalPage">
      <Seo title={t('meta.titles.engineering')} description={t('meta.descriptions.engineering')} breadcrumbs={[{ name: t('meta.titles.engineering'), path: '/engineering' }]} />

      <section className="internalHero internalHeroDark">
        <div className="container">

          <div className="internalHeroMeta">
            <span>{meta[0]}</span>
            <span>{meta[1]}</span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              {t('pages.engineering.eyebrow')}
            </p>

            <h1>
              {t('pages.engineering.title')}
              <span>{t('pages.engineering.titleAccent')}</span>
            </h1>

          </div>

        </div>
      </section>

    </main>
  );
}
