import { useTranslation } from 'react-i18next';
import { GitCompareArrows, SlidersHorizontal, Table2, Wand2 } from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import FinderCta from '../../components/ui/FinderCta';
import CatalogLink from '../../components/ui/CatalogLink';
import useLanguage from '../../hooks/useLanguage';
import formatNumber from '../../utils/formatNumber';
import portfolio, { totals } from '../../data/productPortfolio';

/*
  Products: the product groups of the 2025 brochure, built from the product
  tables (model counts and volume ranges stay in sync with the admin panel).
  Texts: productExplorer.items.<id> and productsPage.* in the locale files.
*/

const TOOLS = [
  { to: '/water-tanks', icon: SlidersHorizontal, title: 'meta.titles.waterTanks', text: 'waterTanks.intro' },
  { to: '/tank-finder', icon: Wand2, title: 'meta.titles.tankFinder', text: 'finder.ctaText' },
  { to: '/product-tables', icon: Table2, title: 'meta.titles.productTables', text: 'productsPage.tablesText' },
  { to: '/compare', icon: GitCompareArrows, title: 'meta.titles.compare', text: 'compare.description' },
];

const pad = (n) => String(n).padStart(2, '0');

export default function Products() {
  const { t } = useTranslation();
  const { openQuote } = useQuote();
  const { code: lang } = useLanguage();

  const p = (key) => t(`productExplorer.${key}`);
  const text = (id, field) => t(`productExplorer.items.${id}.${field}`);
  const num = (value) => formatNumber(value, lang);

  const range = (group) => {
    if (group.minVolume === null) return '';

    return group.minVolume === group.maxVolume
      ? `${num(group.minVolume)} L`
      : `${num(group.minVolume)} – ${num(group.maxVolume)} L`;
  };

  return (
    <main className="internalPage productsPage">
      <Seo title={t('meta.titles.products')} description={t('meta.descriptions.products')} breadcrumbs={[{ name: t('meta.titles.products'), path: '/products' }]} />

      <PageHeader
        crumbs={[{ label: t('nav.products') }]}
        eyebrow={t('productsPage.eyebrow')}
        title={t('productsPage.title')}
        accent={t('productsPage.titleAccent')}
        lead={t('productsPage.text')}
        media={[
          { src: '/images/products/rd-15000.webp' },
          { src: '/images/products/mixer-silo-tank.webp' },
          { src: '/images/products/stackable-trolley.webp' },
        ]}
        actions={(
          <>
            <FinderCta tone="glass" />
            <CatalogLink placement="products" />
          </>
        )}
        facts={[
          { value: portfolio.length, label: t('productTables.groupsLabel') },
          { value: totals.families, label: p('statsFamilies') },
          { value: totals.models, label: p('statsModels') },
        ]}
      />

      <section className="productsTools">
        <div className="container productsToolsGrid">
          {TOOLS.map((tool) => (
            <LocalizedLink key={tool.to} to={tool.to} className="productsTool">
              <span className="productsToolIcon" aria-hidden="true"><tool.icon /></span>
              <span className="productsToolText">
                <strong>{t(tool.title)}</strong>
                <span>{t(tool.text, { max: 4 })}</span>
              </span>
              <Arrow className="productsToolArrow" />
            </LocalizedLink>
          ))}
        </div>
      </section>

      <section className="cmBlock pfSection">
        <div className="container">
          <div className="cmSectionHead cmSectionHeadSplit">
            <div>
              <p className="eyebrow">{t('productsPage.catalogIndex')}</p>
              <h2>
                {t('productsPage.catalogTitle')}
                <span>{t('productsPage.catalogTitleAccent')}</span>
              </h2>
            </div>
            <p className="cmLead">{t('productsPage.catalogText')}</p>
          </div>

          <ul className="pfGrid">
            {portfolio.map((group, index) => (
              <li key={group.id} className="pfCard" id={group.id}>
                <LocalizedLink to={group.link} className="pfMedia" tabIndex={-1} aria-hidden="true">
                  <img
                    src={group.image}
                    alt=""
                    loading={index < 3 ? 'eager' : 'lazy'}
                    decoding="async"
                    className={group.round ? 'round' : ''}
                  />
                  <span className="pfIndex">{pad(index + 1)}</span>
                  <span className="pfTag">{text(group.id, 'application')}</span>
                </LocalizedLink>

                <div className="pfBody">
                  <span className="pfLabel">{text(group.id, 'label')}</span>
                  <h3>
                    <LocalizedLink to={group.link}>{text(group.id, 'title')}</LocalizedLink>
                  </h3>
                  <p>{text(group.id, 'description')}</p>

                  <dl className="pfMeta">
                    <div>
                      <dt>{group.custom ? p('application') : p('range')}</dt>
                      <dd>{group.custom ? p('projectBased') : range(group) || '–'}</dd>
                    </div>
                    <div>
                      <dt>{p('modelsLabel')}</dt>
                      <dd>{group.custom ? '–' : group.models}</dd>
                    </div>
                  </dl>

                  <div className="pfActions">
                    <LocalizedLink to={group.link} className="pfPrimary">
                      {group.custom ? p('customLink') : p('explore')}
                      <Arrow />
                    </LocalizedLink>
                    {group.finder ? (
                      <LocalizedLink to="/tank-finder" className="pfSecondary">
                        <Wand2 aria-hidden="true" />
                        {p('finder')}
                      </LocalizedLink>
                    ) : (
                      <button type="button" className="pfSecondary" onClick={() => openQuote(text(group.id, 'title'))}>
                        {p('quote')}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cmCta">
        <div className="container">
          <div className="cmCtaPanel">
            <div>
              <h2>{t('productsPage.ctaTitle')}</h2>
              <p>{t('productsPage.ctaText')}</p>
            </div>

            <div className="cmCtaActions">
              <button type="button" className="button primary" onClick={() => openQuote()}>
                <span>{t('common.requestQuote')}</span>
                <Arrow className="buttonArrow" />
              </button>
              <LocalizedLink to="/custom-molding" className="cmCtaLink">
                {p('customLink')}
                <Arrow />
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
