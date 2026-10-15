import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import portfolio, { totals } from '../../data/productPortfolio';
import useLanguage from '../../hooks/useLanguage';
import useSectors from './useSectors';

const pad = (n) => String(n).padStart(2, '0');

/*
  Industries overview: one introduction card per sector, each opening the
  sector's own page (/industries/:slug) with its products.
*/
export default function Industries() {
  const { t } = useTranslation();
  const { openQuote } = useQuote();
  const sectors = useSectors();

  const p = (key, options) => t(`pages.industries.${key}`, options);

  // Earlier links pointed at a section of this page (/industries#water): open that sector's page
  const navigate = useNavigate();
  const { code: lang } = useLanguage();

  useEffect(() => {
    const slug = window.location.hash.slice(1);
    if (slug && sectors.some(({ look }) => look.slug === slug)) navigate(`/${lang}/industries/${slug}`, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="internalPage industriesPage">
      <Seo title={t('meta.titles.industries')} description={t('meta.descriptions.industries')} breadcrumbs={[{ name: t('meta.titles.industries'), path: '/industries' }]} />

      <PageHeader
        crumbs={[{ label: t('nav.industries') }]}
        eyebrow={p('eyebrow')}
        title={p('title')}
        accent={p('titleAccent')}
        lead={t('industries.description')}
        media={[
          { src: '/images/products/road-barrier.webp' },
          { src: '/images/products/adblue-tank.webp' },
          { src: '/images/products/cop-box.webp' },
        ]}
        actions={(
          <>
            <button type="button" className="button primary quoteButton" onClick={() => openQuote()}>
              <span>{t('common.requestQuote')}</span>
              <Arrow className="buttonArrow" />
            </button>
            <LocalizedLink to="/custom-molding" className="button ghost">
              <span>{p('ctaLink')}</span>
              <Arrow className="buttonArrow" />
            </LocalizedLink>
          </>
        )}
        facts={[
          { value: sectors.length, label: p('sectorsLabel') },
          { value: portfolio.length, label: t('productTables.groupsLabel') },
          { value: totals.models, label: t('productExplorer.statsModels') },
        ]}
      />

      <section className="cmBlock secOverview">
        <div className="container">
          <div className="cmSectionHead cmSectionHeadSplit">
            <div>
              <p className="eyebrow">{p('searchEyebrow')}</p>
              <h2>{p('searchTitle')}</h2>
            </div>
            <p className="cmLead">{p('overviewText')}</p>
          </div>

          <ul className="secCards">
            {sectors.map(({ look, industry, products, images, index }) => {
              const Icon = look.icon;
              const shown = products.slice(0, 4);
              const more = products.length - shown.length;

              return (
                <li key={look.slug} style={{ '--hue': look.hue }}>
                  <LocalizedLink to={`/industries/${look.slug}`} className="secCard">
                    <span className={`secCardMedia count${Math.min(images.length, 3)}`} aria-hidden="true">
                      {images.length
                        ? images.slice(0, 3).map((src) => <img key={src} src={src} alt="" loading="lazy" decoding="async" />)
                        : <Icon className="secMediaIcon" />}
                      <span className="secCardIndex">{pad(index + 1)}<small> / {pad(sectors.length)}</small></span>
                    </span>

                    <div className="secCardBody">
                      <div className="secCardTitle">
                        <span className="secIcon" aria-hidden="true"><Icon /></span>
                        <div>
                          <h3>{industry.title}</h3>
                          <small>{products.length} {p('productCount')}</small>
                        </div>
                      </div>
                      <p className="secCardText">{industry.description}</p>

                      <ul className="secCardTags" aria-label={p('productsTitle')}>
                        {shown.map((item, i) => <li key={`${item.name}-${i}`}>{item.name.replace(/\s*\(.*\)$/, '')}</li>)}
                        {more > 0 && <li className="more">+{more}</li>}
                      </ul>

                      <span className="secCardLink">
                        {p('viewSector')}
                        <Arrow />
                      </span>
                    </div>
                  </LocalizedLink>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="cmCta">
        <div className="container">
          <div className="cmCtaPanel">
            <div>
              <h2>{p('ctaTitle')}</h2>
              <p>{p('ctaText')}</p>
            </div>

            <div className="cmCtaActions">
              <LocalizedLink to="/custom-molding" className="button primary">
                <span>{p('ctaLink')}</span>
                <Arrow className="buttonArrow" />
              </LocalizedLink>
              <LocalizedLink to="/contact" className="cmCtaLink">
                <MessageSquare aria-hidden="true" />
                {t('pages.customMolding.ctaContact')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
