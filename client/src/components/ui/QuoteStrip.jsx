import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';

import Arrow from '../i18n/Arrow';
import { LocalizedLink } from '../i18n/LocalizedLink';
import { useQuote } from '../quote/QuoteContext';

/*
  Full-width quote strip above the footer: red → magenta sweep, one line of
  promise, a short note and a white quote button (optionally a contact link).
*/
export default function QuoteStrip({ title, text, buttonLabel, contactLabel }) {
  const { t } = useTranslation();
  const { openQuote } = useQuote();

  return (
    <section className="quoteStrip" data-track-area="quote_strip">
      <div className="container quoteStripInner">
        <div className="quoteStripText">
          <h2>{title || t('quoteStrip.title')}</h2>
          <p>{text || t('quoteStrip.text')}</p>
        </div>

        <div className="quoteStripActions">
          <button type="button" className="button quoteButton quoteStripButton" onClick={() => openQuote()}>
            <span>{buttonLabel || t('quoteStrip.button')}</span>
            <Arrow className="buttonArrow" />
          </button>

          {contactLabel && (
            <LocalizedLink to="/contact" className="quoteStripLink">
              <MessageSquare aria-hidden="true" />
              {contactLabel}
            </LocalizedLink>
          )}
        </div>
      </div>
    </section>
  );
}
