import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';

import { LocalizedLink } from '../i18n/LocalizedLink';
import Arrow from '../i18n/Arrow';

/*
  Eye-catching "Choose with the tank finder" button: rotating light border,
  a periodic shine, twinkling sparkles around the wand and a soft pulse.
  Motion is switched off for visitors who prefer reduced motion.
  tone: 'dark' (on light backgrounds) | 'glass' (on dark backgrounds)
  label: shorter text, e.g. in the header
*/
export default function FinderCta({ tone = 'dark', subtitle = true, className = '', label }) {
  const { t } = useTranslation();

  return (
    <LocalizedLink to="/tank-finder" className={`finderCta ${tone} ${className}`}>
      <span className="finderCtaShine" aria-hidden="true" />

      <span className="finderCtaIcon" aria-hidden="true">
        <Wand2 />
        <i className="spark one" />
        <i className="spark two" />
        <i className="spark three" />
      </span>

      <span className="finderCtaText">
        <strong>{label || t('finder.cta')}</strong>
        {subtitle && <small>{t('finder.ctaText')}</small>}
      </span>

      <Arrow direction="right" className="finderCtaArrow" />
    </LocalizedLink>
  );
}
