import { useTranslation } from 'react-i18next';

import usePageTitle from '../../hooks/usePageTitle';

export default function Company() {
  const { t } = useTranslation();

  usePageTitle(t('meta.titles.company'));

  const meta = t('pages.company.meta', { returnObjects: true });

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
