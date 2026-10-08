import { useTranslation } from 'react-i18next';
import {
  Boxes,
  CarFront,
  CloudSun,
  Factory,
  FlaskConical,
  HeartHandshake,
  Hourglass,
  Layers,
  Leaf,
  Recycle,
  ShieldCheck,
  Sun,
  UtensilsCrossed,
  Wrench,
  MessageSquare,
} from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import MachineParkSection from '../../sections/MachineParkSection';
import GlobalPresenceSection from '../../sections/GlobalPresenceSection';

/*
  Company page. Texts follow the RMA Plastik 2025 brochure
  (pages 1, 2 and 6): pages.company.* in the locale files.
*/

// Same order as pages.company.about.cards
const ABOUT_ICONS = [Boxes, Factory, Wrench];

// Same order as pages.company.why.items
const WHY_ICONS = [Recycle, CloudSun, FlaskConical, Layers, UtensilsCrossed, Hourglass, ShieldCheck, HeartHandshake];

// Same order as pages.company.eco.items
const ECO_ICONS = [Sun, CarFront, Leaf, Recycle];

const pad = (n) => String(n).padStart(2, '0');

export default function Company() {
  const { t } = useTranslation();
  const { openQuote } = useQuote();

  const c = (key) => t(`pages.company.${key}`);
  const list = (key) => {
    const value = t(`pages.company.${key}`, { returnObjects: true });
    return Array.isArray(value) ? value : [];
  };

  const stats = t('stats.items', { returnObjects: true });

  return (
    <main className="internalPage companyPage">
      <Seo title={t('meta.titles.company')} description={t('meta.descriptions.company')} breadcrumbs={[{ name: t('meta.titles.company'), path: '/company' }]} />

      <PageHeader
        crumbs={[{ label: t('nav.company') }]}
        eyebrow={c('eyebrow')}
        title={c('title')}
        accent={c('titleAccent')}
        lead={c('text')}
        media={[
          { src: '/images/products/rd-15000.webp' },
          { src: '/images/products/silo-tank.webp' },
          { src: '/images/products/textile-trolley.webp' },
        ]}
        actions={(
          <>
            <button type="button" className="button primary" onClick={() => openQuote()}>
              <span>{t('common.requestQuote')}</span>
              <Arrow className="buttonArrow" />
            </button>
            <LocalizedLink to="/products" className="button ghost">
              <span>{t('hero.exploreProducts')}</span>
              <Arrow className="buttonArrow" />
            </LocalizedLink>
          </>
        )}
        facts={(Array.isArray(stats) ? stats : []).map((item) => ({ value: item.value, label: item.label }))}
      />

      {/* About */}
      <section className="cmBlock coAbout" id="about">
        <div className="container">
          <div className="cmSectionHead cmSectionHeadSplit">
            <div>
              <p className="eyebrow">{c('about.label')}</p>
              <h2>
                {c('about.title')}
                <span>{c('about.titleAccent')}</span>
              </h2>
            </div>
            <p className="cmLead">{c('about.text')}</p>
          </div>

          <ul className="coCards">
            {list('about.cards').map((card, index) => {
              const Icon = ABOUT_ICONS[index % ABOUT_ICONS.length];

              return (
                <li key={card.title} className="coCard">
                  <span className="coIcon" aria-hidden="true"><Icon /></span>
                  <span className="coIndex">{pad(index + 1)}</span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Why rotational moulding and polyethylene */}
      <section className="cmBlock coWhy" id="quality">
        <div className="container">
          <div className="cmSectionHead cmSectionHeadSplit">
            <div>
              <p className="eyebrow">{c('why.label')}</p>
              <h2>
                {c('why.title')}
                <span>{c('why.titleAccent')}</span>
              </h2>
            </div>
            <p className="cmLead">{c('why.text')}</p>
          </div>

          <ol className="coFeatures">
            {list('why.items').map((item, index) => {
              const Icon = WHY_ICONS[index % WHY_ICONS.length];

              return (
                <li key={item.title} className="coFeature">
                  <span className="coIcon" aria-hidden="true"><Icon /></span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <MachineParkSection index={false} />

      {/* Responsible production */}
      <section className="cmBlock coEco" id="sustainability">
        <div className="container">
          <div className="cmSectionHead cmSectionHeadSplit">
            <div>
              <p className="eyebrow">{c('eco.label')}</p>
              <h2>
                {c('eco.title')}
                <span>{c('eco.titleAccent')}</span>
              </h2>
            </div>
            <p className="cmLead">{c('eco.text')}</p>
          </div>

          <ul className="coEcoGrid">
            {list('eco.items').map((item, index) => {
              const Icon = ECO_ICONS[index % ECO_ICONS.length];

              return (
                <li key={item.title} className="coEcoItem">
                  <span className="coIcon" aria-hidden="true"><Icon /></span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </li>
              );
            })}
          </ul>

          <p className="coSocial">
            <HeartHandshake aria-hidden="true" />
            {c('eco.social')}
          </p>
        </div>
      </section>

      <GlobalPresenceSection index={false} />

      {/* CTA */}
      <section className="cmCta">
        <div className="container">
          <div className="cmCtaPanel">
            <div>
              <h2>{c('cta.title')}</h2>
              <p>{c('cta.text')}</p>
            </div>

            <div className="cmCtaActions">
              <button type="button" className="button primary" onClick={() => openQuote()}>
                <span>{t('common.requestQuote')}</span>
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
