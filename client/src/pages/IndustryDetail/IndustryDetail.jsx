import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import { LEGACY_INDUSTRIES } from '../../data/industries';
import { familyText } from '../../data/productTables';
import useLanguage from '../../hooks/useLanguage';
import useSectors from '../Industries/useSectors';

const pad = (n) => String(n).padStart(2, '0');

/*
  Sector page (/industries/:slug): the sector's introduction and its products
  as the Products page cards, then the other sectors.
  Sectors of the earlier list open the sector that now covers them.
*/
export default function IndustryDetail() {
  const { lang, slug } = useParams();
  const { t } = useTranslation();
  const { openQuote } = useQuote();
  const { code } = useLanguage();
  const sectors = useSectors();

  const p = (key, options) => t(`pages.industries.${key}`, options);
  const sector = sectors.find(({ look }) => look.slug === slug);

  if (!sector) {
    const target = LEGACY_INDUSTRIES[slug];
    return <Navigate to={`/${lang}/industries${target ? `/${target}` : ''}`} replace />;
  }

  const { look, industry, products, images, firstGroup, index } = sector;
  const Icon = look.icon;
  const others = sectors.filter((item) => item.look.slug !== slug);
  const path = `/industries/${slug}`;

  // Models behind the sector's products (each product table counted once)
  const tables = new Map();
  products.forEach((item) => {
    if (item.familyData) tables.set(item.familyData.id, item.familyData.rows.length);
    else if (item.groupData && !item.quote) item.groupData.members.forEach((family) => tables.set(family.id, family.rows.length));
  });
  const models = [...tables.values()].reduce((sum, n) => sum + n, 0);

  const sectorQuote = () => openQuote(`${industry.title} – ${t('meta.titles.industries')}`, { hint: { group: firstGroup, stored: look.stored } });

  return (
    <main className="internalPage industriesPage industryDetailPage" style={{ '--hue': look.hue }}>
      <Seo
        title={`${industry.title} – ${t('meta.titles.industries')}`}
        description={industry.description}
        breadcrumbs={[
          { name: t('meta.titles.industries'), path: '/industries' },
          { name: industry.title, path },
        ]}
      />

      <PageHeader
        crumbs={[{ label: t('nav.industries'), to: '/industries' }, { label: industry.title }]}
        eyebrow={`${pad(index + 1)} / ${pad(sectors.length)} · ${p('sectorLabel')}`}
        title={industry.title}
        lead={industry.description}
        media={images.slice(0, 3).map((src) => ({ src }))}
        actions={(
          <>
            <button type="button" className="button primary quoteButton" onClick={sectorQuote}>
              <span>{p('quote')}</span>
              <Arrow className="buttonArrow" />
            </button>
            <LocalizedLink to="/industries" className="button ghost">
              <span>{p('allSectors')}</span>
              <Arrow className="buttonArrow" />
            </LocalizedLink>
          </>
        )}
        facts={[
          { value: products.length, label: p('productCount') },
          ...(models ? [{ value: models, label: t('productExplorer.statsModels') }] : []),
        ]}
      />

      <section className="cmBlock secPage" aria-labelledby="sector-products">
        <div className="container">
          <div className="cmSectionHead cmSectionHeadSplit">
            <div>
              <p className="eyebrow">{industry.title}</p>
              <h2 id="sector-products">{p('productsTitle')}</h2>
            </div>
            <p className="cmLead">{p('productsText')}</p>
          </div>

          <ul className="pfGrid secGrid">
            {products.map((item, i) => {
              // The family's own text, else the group's; made-to-order items get the request note
              const description = item.quote
                ? p('onRequestText')
                : item.familyData
                  ? familyText(item.familyData, 'text', code, t) || t(`productExplorer.items.${item.groupData.id}.description`)
                  : t(`productExplorer.items.${item.groupData.id}.description`);
              const label = item.quote || !item.groupData
                ? t('productExplorer.onRequest')
                : t(`productExplorer.items.${item.groupData.id}.label`);
              const askQuote = () => openQuote(`${item.name} – ${industry.title}`, { hint: { group: item.group || firstGroup, stored: look.stored } });
              const media = item.image
                ? <img src={item.image} alt="" loading={i < 4 ? 'eager' : 'lazy'} decoding="async" />
                : <Icon className="secMediaIcon" />;

              return (
                <li key={`${item.name}-${i}`} className="pfCard">
                  {item.link ? (
                    <LocalizedLink to={item.link} className="pfMedia" tabIndex={-1} aria-hidden="true">{media}</LocalizedLink>
                  ) : (
                    <span className="pfMedia" aria-hidden="true">{media}</span>
                  )}

                  <div className="pfBody">
                    <span className="pfLabel">{label}</span>
                    <h3>
                      {item.link ? <LocalizedLink to={item.link}>{item.name}</LocalizedLink> : item.name}
                    </h3>
                    <p>{description}</p>

                    <div className="pfActions">
                      {item.link ? (
                        <>
                          <LocalizedLink to={item.link} className="pfPrimary" aria-label={`${p('productLink')}: ${item.name}`}>
                            {p('productLink')}
                            <Arrow />
                          </LocalizedLink>
                          <button type="button" className="pfSecondary" onClick={askQuote} aria-label={`${t('productExplorer.quote')}: ${item.name}`}>
                            {t('productExplorer.quote')}
                          </button>
                        </>
                      ) : (
                        <button type="button" className="pfPrimary" onClick={askQuote} aria-label={`${t('productExplorer.quote')}: ${item.name}`}>
                          {t('productExplorer.quote')}
                          <Arrow />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="cmBlock secOthers" aria-labelledby="other-sectors">
        <div className="container">
          <div className="cmSectionHead">
            <p className="eyebrow">{t('nav.industries')}</p>
            <h2 id="other-sectors">{p('otherSectors')}</h2>
          </div>

          <ul className="secOtherList">
            {others.map((other) => {
              const OtherIcon = other.look.icon;
              return (
                <li key={other.look.slug}>
                  <LocalizedLink to={`/industries/${other.look.slug}`}>
                    <span className="secIcon" aria-hidden="true"><OtherIcon /></span>
                    <span>
                      <strong>{other.industry.title}</strong>
                      <small>{other.products.length} {p('productCount')}</small>
                    </span>
                    <Arrow />
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
              <button type="button" className="button primary quoteButton" onClick={sectorQuote}>
                <span>{p('quote')}</span>
                <Arrow className="buttonArrow" />
              </button>
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
