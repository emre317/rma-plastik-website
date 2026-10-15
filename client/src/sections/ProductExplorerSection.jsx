import { useTranslation } from 'react-i18next';
import { GitCompareArrows, Table2, Wand2, Waves } from 'lucide-react';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';
import { useQuote } from '../components/quote/QuoteContext';
import useLanguage from '../hooks/useLanguage';
import formatNumber from '../utils/formatNumber';
import portfolio, { totals } from '../data/productPortfolio';
import SectionDeco from '../components/ui/SectionDeco';

/*
  "04 / Ürünler – Ürün portföyü": every product group as a photo card (model
  counts and volume ranges from the product tables), then quick links to the
  product tools. Made-to-order groups open the quote form.
*/
export default function ProductExplorerSection() {
  const { t } = useTranslation();
  const { code: lang } = useLanguage();
  const { openQuote } = useQuote();

  const p = (key, options) => t(`productExplorer.${key}`, options);
  const text = (id, field) => p(`items.${id}.${field}`);
  const num = (value) => formatNumber(value, lang);

  const range = (group) =>
    group.minVolume === null
      ? null
      : group.minVolume === group.maxVolume
        ? `${num(group.minVolume)} L`
        : `${num(group.minVolume)} – ${num(group.maxVolume)} L`;

  const quickLinks = [
    { to: '/water-tanks', icon: Waves, label: t('meta.titles.waterTanks') },
    { to: '/tank-finder', icon: Wand2, label: t('meta.titles.tankFinder') },
    { to: '/product-tables', icon: Table2, label: t('meta.titles.productTables') },
    { to: '/compare', icon: GitCompareArrows, label: t('meta.titles.compare') },
  ];

  return (
    <section className="productExplorerSection portfolioSection" id="products">
      <SectionDeco tone="light" ring="start" />
      <div className="container">

        <div className="productExplorerHeader">
          <div>
            <span className="sectionIndex">{p('index')}</span>
            <p className="eyebrow">{p('eyebrow')}</p>
          </div>

          <div>
            <h2>
              {p('title')}
              <span>{p('titleAccent')}</span>
            </h2>

            <p className="productIntroText">{p('intro')}</p>

            <dl className="portfolioTotals">
              <div>
                <dt>{portfolio.length}</dt>
                <dd>{p('eyebrow')}</dd>
              </div>
              <div>
                <dt>{totals.families}</dt>
                <dd>{p('statsFamilies')}</dd>
              </div>
              <div>
                <dt>{totals.models}</dt>
                <dd>{p('statsModels')}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Every product group as a photo card */}
        <ul className="pgGrid">
          {portfolio.map((group, index) => {
            const title = text(group.id, 'title');
            const value = range(group) || (group.custom ? p('projectBased') : group.quoteOnly ? p('onRequest') : `${group.models} ${p('models')}`);
            const action = group.custom ? p('customLink') : group.quoteOnly ? p('quote') : p('explore');

            const body = (
              <>
                <span className="pgMedia" aria-hidden="true">
                  <img src={group.image} alt="" loading={index < 4 ? 'eager' : 'lazy'} decoding="async" className={group.round ? 'round' : ''} />
                  <span className="pgIndex">{String(index + 1).padStart(2, '0')}</span>
                  {group.models > 0 && <span className="pgCount">{group.models} {p('models')}</span>}
                </span>
                <span className="pgBody">
                  <small>{text(group.id, 'application')}</small>
                  <strong>{text(group.id, 'label')}</strong>
                  <em>{value}</em>
                  <span className="pgAction">
                    {action}
                    <Arrow />
                  </span>
                </span>
              </>
            );

            return (
              <li key={group.id} style={{ '--hue': group.hue }}>
                {group.quoteOnly ? (
                  <button type="button" className="pgCard" onClick={() => openQuote(title)} aria-label={`${p('quote')}: ${title}`}>{body}</button>
                ) : (
                  <LocalizedLink to={group.link} className="pgCard" aria-label={`${action}: ${title}`}>{body}</LocalizedLink>
                )}
              </li>
            );
          })}
        </ul>

        <nav className="portfolioQuick" aria-label={p('quickLinks')}>
          {quickLinks.map(({ to, icon: Icon, label }) => (
            <LocalizedLink key={to} to={to}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
              <Arrow />
            </LocalizedLink>
          ))}
        </nav>

      </div>
    </section>
  );
}
