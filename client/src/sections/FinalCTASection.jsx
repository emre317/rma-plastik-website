import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';

export default function FinalCTASection() {
  const { t } = useTranslation();

  return (
    <section className="finalCtaSection" id="contact">
      <div className="container">

        <div className="finalCtaTop">
          <span className="sectionIndex">
            {t('finalCta.index')}
          </span>

          <span className="finalCtaMeta">
            {t('finalCta.meta')}
          </span>
        </div>

        <div className="finalCtaContent">

          <div>
            <p className="eyebrow">
              {t('finalCta.eyebrow')}
            </p>

            <h2>
              {t('finalCta.title')}
              <span>{t('finalCta.titleAccent')}</span>
            </h2>
          </div>

          <div className="finalCtaSide">
            <p>
              {t('finalCta.text')}
            </p>

            <LocalizedLink to="/contact" className="finalCtaButton">
              <span>
                {t('finalCta.button')}
              </span>

              <Arrow className="finalCtaButtonArrow" />
            </LocalizedLink>
          </div>

        </div>

        <div className="finalCtaBottom">

          <div>
            <span>{t('finalCta.production')}</span>
            <strong>{t('common.locations')}</strong>
          </div>

          <div>
            <span>{t('finalCta.country')}</span>
            <strong>{t('common.country')}</strong>
          </div>

          <div>
            <span>{t('finalCta.focus')}</span>
            <strong>{t('finalCta.focusValue')}</strong>
          </div>

        </div>

      </div>
    </section>
  );
}
