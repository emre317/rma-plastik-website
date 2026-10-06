import { useTranslation } from 'react-i18next';
import {
  Building2,
  Car,
  FlaskConical,
  Shirt,
  Ship,
  Sprout,
  UtensilsCrossed,
} from 'lucide-react';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';

// Icons follow the order of industries.items (chemicals, food, agriculture, automotive, textile, infrastructure, marine)
const ICONS = [FlaskConical, UtensilsCrossed, Sprout, Car, Shirt, Building2, Ship];

/*
  Industries as a moving band: cards flow across the full page width,
  a large outlined name strip runs the other way underneath.
  The band pauses on hover/focus; with "reduced motion" it becomes a
  normal horizontally scrollable row.
*/
export default function IndustriesSection() {
  const { t } = useTranslation();

  const industries = t('industries.items', { returnObjects: true });
  const list = Array.isArray(industries) ? industries : [];

  return (
    <section className="industriesSection muted industriesBandSection" id="industries">
      <div className="container">

        <div className="industriesHeader">
          <div>
            <span className="sectionIndex">{t('industries.index')}</span>
            <p className="eyebrow">{t('industries.eyebrow')}</p>
          </div>

          <div>
            <h2>
              {t('industries.title')}
              <span>{t('industries.titleAccent')}</span>
            </h2>

            <p>{t('industries.description')}</p>
          </div>
        </div>

      </div>

      <div className="industriesMarquee" style={{ '--count': list.length }}>
        <div className="industriesMarqueeTrack">
          {[0, 1].map((copy) => (
            <ul key={copy} className="industriesMarqueeGroup" aria-hidden={copy === 1 ? 'true' : undefined}>
              {list.map((industry, index) => {
                const Icon = ICONS[index % ICONS.length];

                return (
                  <li key={industry.title} className="industryBandCard">
                    <div className="industryBandTop">
                      <span className="industryBandIcon" aria-hidden="true">
                        <Icon />
                      </span>
                      <span className="industryIndex">{String(index + 1).padStart(2, '0')}</span>
                    </div>

                    <h3>{industry.title}</h3>
                    <p>{industry.description}</p>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </div>

      <div className="industriesNames" aria-hidden="true">
        <div className="industriesNamesTrack">
          {[0, 1].map((copy) => (
            <span key={copy} className="industriesNamesGroup">
              {list.map((industry) => (
                <span key={industry.title}>{industry.title}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="container">
        <div className="industriesCta">
          <div>
            <span className="industryCtaEyebrow">{t('industries.ctaEyebrow')}</span>
            <h3>{t('industries.ctaTitle')}</h3>
          </div>

          <LocalizedLink to="/contact" className="button primary">
            <span>{t('industries.ctaLink')}</span>
            <Arrow className="buttonArrow" />
          </LocalizedLink>
        </div>
      </div>
    </section>
  );
}
