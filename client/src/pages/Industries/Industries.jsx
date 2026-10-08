import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import INDUSTRIES from '../../data/industries';
import portfolio, { totals } from '../../data/productPortfolio';

const pad = (n) => String(n).padStart(2, '0');

export default function Industries() {
  const { t } = useTranslation();
  const { openQuote } = useQuote();

  const items = t('industries.items', { returnObjects: true });
  const list = Array.isArray(items) ? items : [];
  const p = (key) => t(`pages.industries.${key}`);

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
            <button type="button" className="button primary" onClick={() => openQuote()}>
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
          { value: list.length, label: p('sectorsLabel') },
          { value: portfolio.length, label: t('productTables.groupsLabel') },
          { value: totals.models, label: t('productExplorer.statsModels') },
        ]}
      />

      <section className="cmBlock inSectors">
        <div className="container">
          <ol className="inList">
            {list.map((industry, index) => {
              const look = INDUSTRIES[index % INDUSTRIES.length];
              const Icon = look.icon;
              const related = look.groups
                .map((id) => portfolio.find((group) => group.id === id))
                .filter(Boolean);

              return (
                <li key={industry.title} id={look.slug} className="inSector" style={{ '--hue': look.hue }}>
                  <div className="inSectorHead">
                    <span className="inSectorIcon" aria-hidden="true"><Icon /></span>
                    <span className="inSectorIndex">
                      {pad(index + 1)}
                      <small> / {pad(list.length)}</small>
                    </span>
                  </div>

                  <h2>{industry.title}</h2>
                  <p>{industry.description}</p>

                  {related.length > 0 && (
                    <div className="inRelated">
                      <span className="inRelatedLabel">{p('relatedLabel')}</span>
                      <ul>
                        {related.map((group) => (
                          <li key={group.id}>
                            <LocalizedLink to={group.link}>
                              <span className="inThumb" aria-hidden="true">
                                <img src={group.image} alt="" loading="lazy" decoding="async" />
                              </span>
                              <span>{t(`productExplorer.items.${group.id}.label`)}</span>
                              <Arrow />
                            </LocalizedLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    className="inQuote"
                    onClick={() => openQuote(`${industry.title} – ${t('meta.titles.industries')}`)}
                  >
                    {p('quote')}
                    <Arrow />
                  </button>
                </li>
              );
            })}
          </ol>
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
