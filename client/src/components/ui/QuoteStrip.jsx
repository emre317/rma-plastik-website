import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';

import Arrow from '../i18n/Arrow';
import { LocalizedLink } from '../i18n/LocalizedLink';
import { useQuote } from '../quote/QuoteContext';

/*
  Closing quote panel above the footer (the same pink striped panel as the
  other pages): one line of promise, a short note, a white quote button and
  optionally a contact link.
*/
export default function QuoteStrip({ title, text, buttonLabel, contactLabel }) {
  const { t } = useTranslation();
  const { openQuote } = useQuote();

  return (
    <section className="cmCta quoteStrip" data-track-area="quote_strip">
      <div className="container">
        <div className="cmCtaPanel">
          <div>
            <h2>{title || t('quoteStrip.title')}</h2>
            <p>{text || t('quoteStrip.text')}</p>
          </div>

          <div className="cmCtaActions">
            <button type="button" className="button primary quoteButton" onClick={() => openQuote()}>
              <span>{buttonLabel || t('quoteStrip.button')}</span>
              <Arrow className="buttonArrow" />
            </button>

            {contactLabel && (
              <LocalizedLink to="/contact" className="cmCtaLink">
                <MessageSquare aria-hidden="true" />
                {contactLabel}
              </LocalizedLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
