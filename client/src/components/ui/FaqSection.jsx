import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, PhoneCall } from 'lucide-react';

import { LocalizedLink } from '../i18n/LocalizedLink';
import Arrow from '../i18n/Arrow';
import useLanguage from '../../hooks/useLanguage';
import { faqsForLanguage } from '../../data/faq';

/*
  Accordion of questions: one item open at a time, clicking it again closes it
  (same behaviour as a "single, collapsible" accordion). Answers keep their
  paragraphs (blank line in the admin panel).
*/
export function FaqAccordion({ items, defaultOpen = -1 }) {
  const [open, setOpen] = useState(defaultOpen);
  const baseId = useId();

  return (
    <div className="faqAccordion">
      {items.map((item, index) => {
        const expanded = open === index;
        const buttonId = `${baseId}-q${index}`;
        const panelId = `${baseId}-a${index}`;

        return (
          <div key={item.question} className={`faqAccordionItem ${expanded ? 'open' : ''}`}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? -1 : index)}
              >
                <span>{item.question}</span>
                <ChevronDown aria-hidden="true" />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} className="faqAccordionPanel" inert={!expanded}>
              <div className="faqAccordionInner">
                {item.answer.split(/\n{2,}/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/*
  Home page FAQ (above the contact section): intro and contact button on one
  side, the first questions on the other. Questions come from the admin panel
  (Sık sorulan sorular); without published questions in this language the
  section is not shown.
*/
export default function FaqSection({ limit = 8 }) {
  const { t } = useTranslation();
  const { code: lang } = useLanguage();
  const items = faqsForLanguage(lang);

  if (!items.length) return null;

  return (
    <section className="faqSection" id="faq">
      <div className="container faqSectionGrid">
        <div className="faqSectionIntro">
          <span className="faqBadge">{t('faq.eyebrow')}</span>
          <h2>
            {t('faq.title')}
            <span>{t('faq.titleAccent')}</span>
          </h2>
          <p>{t('faq.homeText')}</p>
          <div className="faqSectionActions">
            <LocalizedLink to="/contact" className="button ghost faqContactButton">
              <span>{t('faq.homeCta')}</span>
              <PhoneCall aria-hidden="true" className="buttonIcon" />
            </LocalizedLink>
            {items.length > limit && (
              <LocalizedLink to="/faq" className="wtTextLink">
                {t('faq.seeAll')}
                <Arrow />
              </LocalizedLink>
            )}
          </div>
        </div>

        <FaqAccordion items={items.slice(0, limit)} />
      </div>
    </section>
  );
}
