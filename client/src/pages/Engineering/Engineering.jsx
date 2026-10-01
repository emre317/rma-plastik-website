import { useTranslation } from 'react-i18next';

import usePageTitle from '../../hooks/usePageTitle';

export default function Engineering() {
  const { t } = useTranslation();

  usePageTitle(t('meta.titles.engineering'));

  const meta = t('pages.engineering.meta', { returnObjects: true });

  return (
    <main className="internalPage">

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
