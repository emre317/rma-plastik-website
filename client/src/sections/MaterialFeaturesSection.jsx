import { useTranslation } from 'react-i18next';
import { BadgeCheck, Box, FlaskConical, Utensils } from 'lucide-react';

/*
  Polyethylene raw material properties: a full-width dark strip of four columns
  right under the hero (same layout as the feature strip on the Pan's Marine site)
*/

const ICONS = [BadgeCheck, FlaskConical, Utensils, Box];

export default function MaterialFeaturesSection() {
  const { t } = useTranslation();
  const items = t('materialFeatures.items', { returnObjects: true });

  if (!Array.isArray(items) || !items.length) return null;

  return (
    <section className="matFeatures" aria-labelledby="mat-features-title">
      <div className="container">
        <h2 id="mat-features-title" className="visuallyHidden">{t('materialFeatures.title')}</h2>

        <ul className="matFeaturesList">
          {items.map((item, index) => {
            const Icon = ICONS[index % ICONS.length];

            return (
              <li key={item.title}>
                <span className="matFeaturesIcon" aria-hidden="true"><Icon /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
