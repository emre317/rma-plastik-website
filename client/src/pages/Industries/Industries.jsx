import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import INDUSTRIES, { sectorProduct } from '../../data/industries';
import portfolio, { totals } from '../../data/productPortfolio';
import { familyText } from '../../data/productTables';
import useLanguage from '../../hooks/useLanguage';

const pad = (n) => String(n).padStart(2, '0');

export default function Industries() {
  const { t } = useTranslation();
  const { openQuote } = useQuote();
  const { code: lang } = useLanguage();

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
          { value: list.length, label: p('sectorsLabel') },
          { value: portfolio.length, label: t('productTables.groupsLabel') },
          { value: totals.models, label: t('productExplorer.statsModels') },
        ]}
      />

      <section className="cmBlock inSectors">
        <div className="container">
          <div className="cmSectionHead">
            <p className="eyebrow">{p('searchEyebrow')}</p>
            <h2>{p('searchTitle')}</h2>
          </div>

          {/* Jump to a sector */}
          <nav className="inJump" aria-label={p('searchTitle')}>
            {list.map((industry, index) => {
              const look = INDUSTRIES[index % INDUSTRIES.length];
              const Icon = look.icon;
              return (
                <a key={look.slug} href={`#${look.slug}`} style={{ '--hue': look.hue }}>
                  <Icon aria-hidden="true" />
                  {industry.title}
                </a>
              );
            })}
          </nav>

          <ol className="inList">
            {list.map((industry, index) => {
              const look = INDUSTRIES[index % INDUSTRIES.length];
              const Icon = look.icon;
              const names = Array.isArray(industry.products) ? industry.products : [];
              const products = look.products.map((entry, i) => ({ ...sectorProduct(entry), name: names[i] || '' })).filter((item) => item.name);
              const firstGroup = look.products.find((entry) => entry.group)?.group;

              return (
                <li key={look.slug} id={look.slug} className="inSector" style={{ '--hue': look.hue }}>
                  <div className="inSectorHead">
                    <span className="inSectorIcon" aria-hidden="true"><Icon /></span>
                    <div>
                      <span className="inSectorIndex">
                        {pad(index + 1)}
                        <small> / {pad(list.length)}</small>
                      </span>
                      <h2>{industry.title}</h2>
                      <p>{industry.description}</p>
                    </div>
                    <button
                      type="button"
                      className="inQuote"
                      onClick={() => openQuote(`${industry.title} – ${t('meta.titles.industries')}`, { hint: { group: firstGroup, stored: look.stored } })}
                    >
                      {p('quote')}
                      <Arrow />
                    </button>
                  </div>

                  <ul className="inProducts">
                    {products.map((item, i) => {
                      // The family's own text, else the group's; made-to-order items get the request note
                      const description = item.quote
                        ? p('onRequestText')
                        : item.familyData
                          ? familyText(item.familyData, 'text', lang, t) || t(`productExplorer.items.${item.groupData.id}.description`)
                          : t(`productExplorer.items.${item.groupData.id}.description`);
                      const askQuote = () => openQuote(`${item.name} – ${industry.title}`, { hint: { group: item.group || firstGroup, stored: look.stored } });

                      const body = (
                        <>
                          <span className="inProductMedia" aria-hidden="true">
                            {item.image ? <img src={item.image} alt="" loading="lazy" decoding="async" /> : <Icon />}
                          </span>
                          <span className="inProductBody">
                            <strong>{item.name}</strong>
                            <small>{description}</small>
                            <em>
                              {item.link ? p('productLink') : t('productExplorer.quote')}
                              <Arrow />
                            </em>
                          </span>
                        </>
                      );

                      return (
                        <li key={`${item.name}-${i}`}>
                          {item.link ? (
                            <LocalizedLink to={item.link} className="inProduct">{body}</LocalizedLink>
                          ) : (
                            <button type="button" className="inProduct" onClick={askQuote}>{body}</button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
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
