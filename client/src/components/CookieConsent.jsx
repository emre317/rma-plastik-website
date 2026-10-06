import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CONSENT_EVENT,
  readConsent,
  saveConsent,
} from '../analytics/consent';

/*
  KVKK / GDPR cookie banner wired to Google Consent Mode v2.
  Analytics (GA4, Hotjar) and marketing (Google Ads, Meta Pixel) tags in
  GTM only run after the visitor allows the matching category.
*/
export default function CookieConsent() {
  const { t } = useTranslation();

  // Rendered only in the browser: the stored choice is unknown at prerender time
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [choice, setChoice] = useState({ analytics: false, marketing: false });

  useEffect(() => {
    const stored = readConsent();

    if (stored) {
      setChoice({ analytics: stored.analytics, marketing: stored.marketing });
    } else {
      setOpen(true);
    }

    function reopen() {
      const current = readConsent();

      if (current) {
        setChoice({ analytics: current.analytics, marketing: current.marketing });
      }

      setShowDetails(true);
      setOpen(true);
    }

    window.addEventListener(CONSENT_EVENT, reopen);

    return () => window.removeEventListener(CONSENT_EVENT, reopen);
  }, []);

  function decide(value) {
    saveConsent(value);
    setChoice(value);
    setOpen(false);
    setShowDetails(false);
  }

  if (!open) {
    return null;
  }

  const categories = [
    { key: 'necessary', locked: true },
    { key: 'analytics' },
    { key: 'marketing' },
  ];

  return (
    <div
      className="cookieConsent"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-text"
    >
      <p className="cookieConsentTitle" id="cookie-consent-title">
        {t('cookies.title')}
      </p>

      <p className="cookieConsentText" id="cookie-consent-text">
        {t('cookies.text')}
      </p>

      {showDetails && (
        <ul className="cookieConsentOptions">
          {categories.map((category) => {
            const checked = category.locked || choice[category.key];

            return (
              <li key={category.key}>
                <label>
                  <span>
                    <strong>{t(`cookies.categories.${category.key}.name`)}</strong>
                    <small>{t(`cookies.categories.${category.key}.description`)}</small>
                  </span>

                  <input
                    type="checkbox"
                    role="switch"
                    checked={checked}
                    disabled={category.locked}
                    onChange={(event) =>
                      setChoice((current) => ({
                        ...current,
                        [category.key]: event.target.checked,
                      }))
                    }
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="cookieConsentActions">
        {showDetails ? (
          <button
            type="button"
            className="cookieButton cookieButtonPrimary"
            onClick={() => decide(choice)}
          >
            {t('cookies.save')}
          </button>
        ) : (
          <button
            type="button"
            className="cookieButton cookieButtonGhost"
            onClick={() => setShowDetails(true)}
          >
            {t('cookies.customize')}
          </button>
        )}

        <button
          type="button"
          className="cookieButton"
          onClick={() => decide({ analytics: false, marketing: false })}
        >
          {t('cookies.reject')}
        </button>

        <button
          type="button"
          className="cookieButton cookieButtonPrimary"
          onClick={() => decide({ analytics: true, marketing: true })}
        >
          {t('cookies.accept')}
        </button>
      </div>
    </div>
  );
}
