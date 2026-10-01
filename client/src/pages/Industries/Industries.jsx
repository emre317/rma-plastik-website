import { useTranslation } from 'react-i18next';

import usePageTitle from '../../hooks/usePageTitle';

export default function Industries() {
  const { t } = useTranslation();

  usePageTitle(t('meta.titles.industries'));

  const meta = t('pages.industries.meta', { returnObjects: true });

  return (
    <main className="internalPage">

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
