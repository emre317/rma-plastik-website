import { useTranslation } from 'react-i18next';

import Seo from '../../seo/Seo';

export default function Company() {
  const { t } = useTranslation();

  const meta = t('pages.company.meta', { returnObjects: true });

  return (
    <main className="internalPage">
      <Seo title={t('meta.titles.company')} description={t('meta.descriptions.company')} breadcrumbs={[{ name: t('meta.titles.company'), path: '/company' }]} />

      <section className="internalHero">
        <div className="container">

          <div className="internalHeroMeta">
            <span>{meta[0]}</span>
            <span>{meta[1]}</span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              {t('pages.company.eyebrow')}
            </p>

            <h1>
              {t('pages.company.title')}
              <span>{t('pages.company.titleAccent')}</span>
            </h1>

          </div>

          <div className="internalHeroBottom">

            <p>
              {t('pages.company.text')}
            </p>

            <span>
              {t('pages.company.since')}
            </span>

          </div>

        </div>
      </section>

    </main>
  );
}
