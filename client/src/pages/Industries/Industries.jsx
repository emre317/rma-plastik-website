import { useEffect, useRef, useState } from 'react';
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

  // Each sector with its look (icon, colour) and its products in the sector's own names
  const sectors = list.map((industry, index) => {
    const look = INDUSTRIES[index % INDUSTRIES.length];
    const names = Array.isArray(industry.products) ? industry.products : [];
    const products = look.products.map((entry, i) => ({ ...sectorProduct(entry), name: names[i] || '' })).filter((item) => item.name);
    return { look, industry, products, firstGroup: look.products.find((entry) => entry.group)?.group };
  });

  // The sector in view, marked in the sector menu
  const [active, setActive] = useState('');
  const slugs = sectors.map(({ look }) => look.slug).join(',');

  useEffect(() => {
    const blocks = slugs.split(',').map((slug) => document.getElementById(slug)).filter(Boolean);
    if (!blocks.length || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (visible.length) setActive(visible[0].target.id);
    }, { rootMargin: '-160px 0px -55% 0px' });

    blocks.forEach((block) => observer.observe(block));
    return () => observer.disconnect();
  }, [slugs]);

  // Keep the marked sector visible in the (horizontally scrolling) menu
  const navList = useRef(null);

  useEffect(() => {
    const list = navList.current;
    const link = list?.querySelector('a.active');
    if (!list || !link) return;

    const listBox = list.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    const offset = linkBox.left - listBox.left - (listBox.width - linkBox.width) / 2;
    list.scrollBy({ left: offset, behavior: 'smooth' });
  }, [active]);

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

      <section className="cmBlock secPage">
        <div className="container">
          <div className="cmSectionHead">
            <p className="eyebrow">{p('searchEyebrow')}</p>
            <h2>{p('searchTitle')}</h2>
          </div>
        </div>

        {/* Sector menu: stays under the header, marks the sector in view */}
        <nav className="secNav" aria-label={p('searchTitle')}>
          <div className="container">
            <ul ref={navList}>
              {sectors.map(({ look, industry, products }) => {
                const Icon = look.icon;
                const current = active === look.slug;
                return (
                  <li key={look.slug}>
                    <a href={`#${look.slug}`} aria-current={current ? 'true' : undefined} className={current ? 'active' : ''}>
                      <Icon aria-hidden="true" />
                      <span>{industry.title}</span>
                      <small aria-label={`${products.length} ${p('productCount')}`}>{products.length}</small>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="container">
          {sectors.map(({ look, industry, products, firstGroup }, index) => {
            const Icon = look.icon;
            const headingId = `${look.slug}-title`;

            return (
              <section key={look.slug} id={look.slug} className="secBlock" aria-labelledby={headingId} style={{ '--hue': look.hue }}>
                <div className="secHead">
                  <span className="secIcon" aria-hidden="true"><Icon /></span>
                  <div className="secHeadText">
                    <p className="eyebrow">
                      {pad(index + 1)} / {pad(sectors.length)} · {products.length} {p('productCount')}
                    </p>
                    <h2 id={headingId}>{industry.title}</h2>
                    <p className="cmLead">{industry.description}</p>
                  </div>
                  <button
                    type="button"
                    className="button primary quoteButton secQuote"
                    onClick={() => openQuote(`${industry.title} – ${t('meta.titles.industries')}`, { hint: { group: firstGroup, stored: look.stored } })}
                  >
                    <span>{p('quote')}</span>
                    <Arrow className="buttonArrow" />
                  </button>
                </div>

                <ul className="pfGrid secGrid">
                  {products.map((item, i) => {
                    // The family's own text, else the group's; made-to-order items get the request note
                    const description = item.quote
                      ? p('onRequestText')
                      : item.familyData
                        ? familyText(item.familyData, 'text', lang, t) || t(`productExplorer.items.${item.groupData.id}.description`)
                        : t(`productExplorer.items.${item.groupData.id}.description`);
                    const label = item.quote || !item.groupData
                      ? t('productExplorer.onRequest')
                      : t(`productExplorer.items.${item.groupData.id}.label`);
                    const askQuote = () => openQuote(`${item.name} – ${industry.title}`, { hint: { group: item.group || firstGroup, stored: look.stored } });
                    const media = (
                      <>
                        {item.image
                          ? <img src={item.image} alt="" loading="lazy" decoding="async" />
                          : <Icon className="secMediaIcon" />}
                      </>
                    );

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
              </section>
            );
          })}
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
