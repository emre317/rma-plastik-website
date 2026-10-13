import { useTranslation } from 'react-i18next';

/* Home hero: four company figures under the buttons (hero.stats in the locale files) */
export default function HeroStats({ className = '' }) {
  const { t } = useTranslation();
  const items = t('hero.stats', { returnObjects: true });

  if (!Array.isArray(items) || !items.length) return null;

  return (
    <dl className={`heroStats ${className}`}>
      {items.map((item) => (
        <div key={item.label}>
          <dt dir="ltr">
            {item.value}
            {item.unit && <span>{item.unit}</span>}
          </dt>
          <dd>{item.label}</dd>
        </div>
      ))}
    </dl>
  );
}
