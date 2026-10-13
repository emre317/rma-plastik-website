import { useTranslation } from 'react-i18next';

import portfolio from '../../data/productPortfolio';
import { Typewriter } from './TypewriterText';

/* Home hero: the product groups typed one after another under the headline */
export default function HeroTypeLine() {
  const { t } = useTranslation();

  const groups = portfolio
    .map((group) => t(`productExplorer.items.${group.id}.label`, { defaultValue: '' }))
    .filter(Boolean);

  if (!groups.length) return null;

  return (
    <p className="heroTypeLine">
      <span className="heroTypePrefix">{t('hero.typePrefix')}</span>
      <Typewriter text={groups} speed={80} deleteSpeed={40} delay={1600} loop waitForBoot className="heroTypeWords" />
    </p>
  );
}
