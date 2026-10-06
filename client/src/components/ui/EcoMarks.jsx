import { useTranslation } from 'react-i18next';
import { CarFront, Recycle, ShieldCheck, Sun } from 'lucide-react';

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

/* Row of cues (footer) */
export function EcoStrip({ types = ['solar', 'noWaste', 'recycle', 'ev'] }) {
  const { t } = useTranslation();

  return (
    <div className="ecoStrip">
      <span className="ecoStripTitle">
        <i aria-hidden="true" />
        {t('eco.title')}
      </span>

      <ul>
        {types.map((type) => {
          const Icon = MARKS[type];
          return (
            <li key={type}>
              <span className="ecoStripIcon" aria-hidden="true"><Icon /></span>
              <span>
                <strong>{t(`eco.${type}`)}</strong>
                <small>{t(`eco.${type}Text`)}</small>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
