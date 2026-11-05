import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CONSENT_EVENT,
  readConsent,
  saveConsent,
} from '../analytics/consent';
import { LocalizedLink } from './i18n/LocalizedLink';

/*
  KVKK cookie banner (texts: KVKK set, section 7). GTM, and with it the
  analytics (GA4) and marketing (Google Ads, Meta Pixel) tags, loads only
  after the visitor allows a category (analytics/consent.js).
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
        {t('cookies.text')}{' '}
        {t('cookies.policyBefore')}
        <LocalizedLink to="/cerez-politikasi" className="cookieConsentLink">{t('cookies.policyLink')}</LocalizedLink>
        {t('cookies.policyAfter')}{' '}
        {t('cookies.change')}
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

      {/* The three choices look the same (KVKK: rejecting is as easy as accepting) */}
      <div className="cookieConsentActions">
        {showDetails ? (
          <button type="button" className="cookieButton" onClick={() => decide(choice)}>
            {t('cookies.save')}
          </button>
        ) : (
          <button type="button" className="cookieButton" onClick={() => setShowDetails(true)}>
            {t('cookies.customize')}
          </button>
        )}

        <button type="button" className="cookieButton" onClick={() => decide({ analytics: false, marketing: false })}>
          {t('cookies.reject')}
        </button>

        <button type="button" className="cookieButton" onClick={() => decide({ analytics: true, marketing: true })}>
          {t('cookies.accept')}
        </button>
      </div>
    </div>
  );
}
