import { useTranslation } from 'react-i18next';
import { CarFront, Leaf, Recycle, ShieldCheck, Sun } from 'lucide-react';

import { LocalizedLink } from '../i18n/LocalizedLink';
import Arrow from '../i18n/Arrow';

/*
  Quiet sustainability cues used across the site. Only facts from the
  2025 brochure (p. 2, 5, 6): solar-powered production, electric vehicles,
  all production scrap recycled (in-house grinders), 100 % recyclable
  material, single-piece long-life products. No carbon figures are claimed.
*/
const MARKS = {
  solar: Sun,
  noWaste: Recycle,
  recycle: Recycle,
  ev: CarFront,
  longLife: ShieldCheck,
};

export function EcoBadge({ type, tone = 'light', withText = false }) {
  const { t } = useTranslation();
  const Icon = MARKS[type];

  return (
    <span className={`ecoBadge ${tone}`} title={t(`eco.${type}Text`)}>
      <Icon aria-hidden="true" />
      <span>{t(`eco.${type}`)}</span>
      {withText && <small>{t(`eco.${type}Text`)}</small>}
    </span>
  );
}

/*
  Responsible-production band (home page, custom molding page): a short
  statement with the brochure facts and a link to the company page section.
*/
export function SustainabilityBand({ types = ['solar', 'noWaste', 'ev', 'recycle'] }) {
  const { t } = useTranslation();

  return (
    <section className="ecoBand" aria-labelledby="eco-band-title">
      <div className="container">
        <div className="ecoBandPanel">
          <div className="ecoBandIntro">
            <span className="ecoBandEyebrow">
              <Leaf aria-hidden="true" />
              {t('eco.title')}
            </span>
            <h2 id="eco-band-title">
              {t('pages.company.eco.title')}
              <span>{t('pages.company.eco.titleAccent')}</span>
            </h2>
            <LocalizedLink to="/company#sustainability" className="ecoBandLink">
              {t('eco.more')}
              <Arrow />
            </LocalizedLink>
          </div>

          <ul className="ecoBandList">
            {types.map((type) => {
              const Icon = MARKS[type];
              return (
                <li key={type}>
                  <span className="ecoBandIcon" aria-hidden="true"><Icon /></span>
                  <strong>{t(`eco.${type}`)}</strong>
                  <small>{t(`eco.${type}Text`)}</small>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
