import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitCompareArrows, Table2, Wand2, Waves } from 'lucide-react';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';
import Carousel3D from '../components/ui/Carousel3D';
import FinderCta from '../components/ui/FinderCta';
import { useQuote } from '../components/quote/QuoteContext';
import useLanguage from '../hooks/useLanguage';
import formatNumber from '../utils/formatNumber';
import portfolio, { totals } from '../data/productPortfolio';
import { familyText } from '../data/productTables';
import SectionDeco from '../components/ui/SectionDeco';

/*
  "04 / Ürünler – Ürün portföyü": the brochure's product groups on a 3D ring
  (real photos, model counts and volume ranges from the product tables),
  the selected group in detail below, and quick links to the product tools.
*/
export default function ProductExplorerSection() {
  const { t } = useTranslation();
  const { code: lang } = useLanguage();
  const { openQuote } = useQuote();

  const [activeIndex, setActiveIndex] = useState(0);
  const onActiveChange = useCallback((index) => setActiveIndex(index), []);

  const p = (key, options) => t(`productExplorer.${key}`, options);
  const text = (id, field) => p(`items.${id}.${field}`);
  const num = (value) => formatNumber(value, lang);

  const range = (group) =>
    group.minVolume === null
      ? null
      : group.minVolume === group.maxVolume
        ? `${num(group.minVolume)} L`
        : `${num(group.minVolume)} – ${num(group.maxVolume)} L`;

  const active = portfolio[activeIndex] || portfolio[0];

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

        <div className="portfolioGallery">
          <div className="portfolioGalleryTop">
            <span>{p('previewTop')}</span>
            <span className="portfolioHint">{p('rotateHint')}</span>
            <span className="portfolioCounter">
              {String(activeIndex + 1).padStart(2, '0')}
              <small> / {String(portfolio.length).padStart(2, '0')}</small>
            </span>
          </div>

          <Carousel3D
            items={portfolio}
            onActiveChange={onActiveChange}
            labels={{
              prev: p('prev'),
              next: p('next'),
              hint: p('rotateHint'),
              goTo: (n) => `${p('selected')} ${n}`,
            }}
            renderCard={(group, { active: isActive, index }) => (
              <LocalizedLink
                to={group.link}
                className="portfolioCard portfolioPhotoCard"
                style={{ '--hue': group.hue }}
                tabIndex={isActive ? 0 : -1}
                draggable={false}
              >
                <span className={`portfolioPhoto ${group.round ? 'round' : ''}`} aria-hidden="true">
                  <img src={group.image} alt="" loading={index < 3 ? 'eager' : 'lazy'} decoding="async" draggable={false} />
                </span>

                <span className="portfolioCardNumber">{String(index + 1).padStart(2, '0')}</span>

                {group.models > 0 && (
                  <span className="portfolioCardCount">
                    {group.models} {p('models')}
                  </span>
                )}

                <span className="portfolioCardBody">
                  <strong>{text(group.id, 'label')}</strong>
                  <em>{range(group) || (group.custom ? p('projectBased') : group.quoteOnly ? p('onRequest') : `${group.models} ${p('models')}`)}</em>
                  <small>{text(group.id, 'application')}</small>
                </span>
              </LocalizedLink>
            )}
          />
        </div>

        <div className="portfolioDetail portfolioDetailRich" aria-live="polite">
          <div className="portfolioDetailMain">
            <span className="productPreviewLabel">{p('selected')}</span>
            <h3>{text(active.id, 'title')}</h3>
            <p>{text(active.id, 'description')}</p>

            {active.members.length > 0 && (
              <div className="portfolioFamilies">
                <span className="cmLabel">{p('familiesTitle')}</span>
                <ul>
                  {active.members.map((family) => (
                    <li key={family.id}>
                      <LocalizedLink to={`/product-tables#${family.id}`}>
                        {familyText(family, 'title', lang, t)}
                        <em>{family.rows.length}</em>
                      </LocalizedLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="portfolioDetailSide">
            <dl>
              <div>
                <dt>{active.custom || active.quoteOnly ? p('application') : p('range')}</dt>
                <dd>{active.custom || active.quoteOnly ? text(active.id, 'application') : range(active) || '–'}</dd>
              </div>
              <div>
                <dt>{active.custom || active.quoteOnly ? p('capacity') : p('modelsLabel')}</dt>
                <dd>{active.custom ? p('projectBased') : active.quoteOnly ? p('onRequest') : active.models}</dd>
              </div>
            </dl>

            <div className="portfolioActions">
              {active.quoteOnly ? (
                <button type="button" className="button primary quoteButton" onClick={() => openQuote(text(active.id, 'title'))}>
                  <span>{p('quote')}</span>
                  <Arrow className="buttonArrow" />
                </button>
              ) : (
                <LocalizedLink to={active.link} className="button primary">
                  <span>{active.custom ? p('customLink') : p('explore')}</span>
                  <Arrow className="buttonArrow" />
                </LocalizedLink>
              )}

              {active.quoteOnly ? null : active.finder ? (
                <FinderCta subtitle={false} />
              ) : (
                <button type="button" className="portfolioSecondary" onClick={() => openQuote(text(active.id, 'title'))}>
                  {p('quote')}
                  <Arrow />
                </button>
              )}
            </div>
          </div>
        </div>

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
