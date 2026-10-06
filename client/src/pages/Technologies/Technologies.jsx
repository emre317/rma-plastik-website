import { useTranslation } from 'react-i18next';

import Seo from '../../seo/Seo';

export default function Technologies() {
  const { t } = useTranslation();

  const meta = t('pages.technologies.meta', { returnObjects: true });

  return (
    <main className="internalPage">
      <Seo title={t('meta.titles.technologies')} description={t('meta.descriptions.technologies')} breadcrumbs={[{ name: t('meta.titles.technologies'), path: '/technologies' }]} />

      <section className="internalHero internalHeroDark">
        <div className="container">

          <div className="internalHeroMeta">
            <span>{meta[0]}</span>
            <span>{meta[1]}</span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              {t('pages.technologies.eyebrow')}
            </p>

            <h1>
              {t('pages.technologies.title')}
              <span>{t('pages.technologies.titleAccent')}</span>
            </h1>

          </div>

        </div>
      </section>

    </main>
  );
}
