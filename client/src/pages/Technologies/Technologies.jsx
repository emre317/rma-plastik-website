import { useTranslation } from 'react-i18next';

import usePageTitle from '../../hooks/usePageTitle';

export default function Technologies() {
  const { t } = useTranslation();

  usePageTitle(t('meta.titles.technologies'));

  const meta = t('pages.technologies.meta', { returnObjects: true });

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
