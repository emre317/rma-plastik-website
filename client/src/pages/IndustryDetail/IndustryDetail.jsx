import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import formatSlug from '../../utils/formatSlug';
import usePageTitle from '../../hooks/usePageTitle';

export default function IndustryDetail() {
  const { t } = useTranslation();
  const { slug } = useParams();

  usePageTitle(formatSlug(slug));

  return (
    <main className="internalPage">

      <section className="internalHero">
        <div className="container">

          <div className="internalHeroMeta">
            <span>{t('pages.industryDetail.meta')}</span>
            <span>{formatSlug(slug)}</span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              {t('pages.industryDetail.eyebrow')}
            </p>

            <h1>
              {t('pages.industryDetail.title')}
              <span>{t('pages.industryDetail.titleAccent')}</span>
            </h1>

          </div>

        </div>
      </section>

    </main>
  );
}
