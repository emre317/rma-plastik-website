import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pause, Play } from 'lucide-react';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';
import INDUSTRIES from '../data/industries';
import SectionDeco from '../components/ui/SectionDeco';

/*
  Industries: dark showcase with a slowly moving row of industry cards
  and a fine name ticker. A pause button stops all movement (also paused
  on hover/focus); with "reduced motion" the row is a scrollable list.
*/
export default function IndustriesSection() {
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);

  const industries = t('industries.items', { returnObjects: true });
  const list = Array.isArray(industries) ? industries : [];

  return (
    <section
      className={`industriesShowcase ${paused ? 'paused' : ''}`}
      id="industries"
      style={{ '--count': list.length }}
    >
      <SectionDeco tone="dark" ring="start" />
      <div className="container">
        <div className="industriesShowcaseHeader">
          <div className="industriesShowcaseIntro">
            <span className="sectionIndex light">{t('industries.index')}</span>
            <p className="eyebrow">{t('industries.eyebrow')}</p>

            <h2>
              {t('industries.title')}
              <span>{t('industries.titleAccent')}</span>
            </h2>

            <p>{t('industries.description')}</p>
          </div>

          <aside className="industriesShowcaseMeta">
            <div className="industriesCount">
              <strong>{String(list.length).padStart(2, '0')}</strong>
              <span>{t('industries.countLabel')}</span>
            </div>

            <div className="industriesMetaCta">
              <span>{t('industries.ctaTitle')}</span>

              <LocalizedLink to="/contact" className="button primary">
                <span>{t('industries.ctaLink')}</span>
                <Arrow className="buttonArrow" />
              </LocalizedLink>
            </div>

            <button
              type="button"
              className="industriesPause"
              onClick={() => setPaused((value) => !value)}
              aria-pressed={paused}
            >
              {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
              <span>{paused ? t('industries.play') : t('industries.pause')}</span>
            </button>
          </aside>
        </div>
      </div>

      <div className="industriesRow">
        <div className="industriesRowTrack">
          {[0, 1].map((copy) => (
            <ul key={copy} className="industriesRowGroup" aria-hidden={copy === 1 ? 'true' : undefined}>
              {list.map((industry, index) => {
                const { icon: Icon, hue, slug } = INDUSTRIES[index % INDUSTRIES.length];

                return (
                  <li key={industry.title} className="industryShowCard" style={{ '--hue': hue }}>
                    <Icon className="industryShowWatermark" aria-hidden="true" />

                    <div className="industryShowTop">
                      <span className="industryShowIcon" aria-hidden="true">
                        <Icon />
                      </span>
                      <span className="industryShowIndex">
                        {String(index + 1).padStart(2, '0')}
                        <small> / {String(list.length).padStart(2, '0')}</small>
                      </span>
                    </div>

                    <div className="industryShowBody">
                      <h3>{industry.title}</h3>
                      <p>{industry.description}</p>

                      <LocalizedLink
                        to={`/industries#${slug}`}
                        className="industryShowLink"
                        tabIndex={copy === 1 ? -1 : undefined}
                      >
                        {t('industries.more')}
                        <Arrow />
                      </LocalizedLink>
                    </div>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </div>

      <div className="industriesTicker" aria-hidden="true">
        <div className="industriesTickerTrack">
          {[0, 1, 2, 3].map((copy) => (
            <span key={copy} className="industriesTickerGroup">
              {list.map((industry) => (
                <span key={industry.title}>{industry.title}</span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
