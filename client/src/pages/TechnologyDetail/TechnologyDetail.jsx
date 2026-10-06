import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import formatSlug from '../../utils/formatSlug';
import Seo from '../../seo/Seo';

// Known technology slugs reuse the translated names from the footer
const technologyNameKeys = {
  'rotational-moulding': 'footer.links.rotational',
  'injection-moulding': 'footer.links.injection',
  'blow-moulding': 'footer.links.blow',
};

export default function TechnologyDetail() {
  const { t } = useTranslation();
  const { slug } = useParams();

  const technologyName = technologyNameKeys[slug]
    ? t(technologyNameKeys[slug])
    : formatSlug(slug);

  return (
    <main className="internalPage">
      <Seo title={technologyName} description={t('meta.descriptions.technologyDetail', { name: technologyName })} breadcrumbs={[{ name: t('meta.titles.technologies'), path: '/technologies' }, { name: technologyName, path: `/technologies/${slug}` }]} />

      <section className="internalHero internalHeroDark">
        <div className="container">

          <div className="internalHeroMeta">
            <span>{t('pages.technologyDetail.meta')}</span>
            <span>{technologyName}</span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              {t('pages.technologyDetail.eyebrow')}
            </p>

            <h1>
              {t('pages.technologyDetail.title')}
              <span>{t('pages.technologyDetail.titleAccent')}</span>
            </h1>

          </div>

        </div>
      </section>

    </main>
  );
}
