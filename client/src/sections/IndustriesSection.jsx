import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';

export default function IndustriesSection() {
  const { t } = useTranslation();

  const industries = t('industries.items', { returnObjects: true });

  return (
    <section className="industriesSection muted" id="industries">
      <div className="container">

        <div className="industriesHeader">

          <div>
            <span className="sectionIndex">
              {t('industries.index')}
            </span>

            <p className="eyebrow">
              {t('industries.eyebrow')}
            </p>
          </div>

          <div>
            <h2>
              {t('industries.title')}
              <span>{t('industries.titleAccent')}</span>
            </h2>

            <p>
              {t('industries.description')}
            </p>
          </div>

        </div>

        <div className="industriesMatrix">

          {industries.map((industry, index) => (
            <article
              className="industryItem"
              key={industry.title}
            >
              <div className="industryItemTop">
                <span className="industryIndex">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <Arrow className="industryArrow" />
              </div>

              <div className="industryItemContent">
                <h3>
                  {industry.title}
                </h3>

                <p>
                  {industry.description}
                </p>
              </div>
            </article>
          ))}

          <article className="industryItem industryItemCta">

            <div className="industryItemTop">
              <span className="industryIndex">
                {String(industries.length + 1).padStart(2, '0')}
              </span>
            </div>

            <div className="industryItemContent">
              <span className="industryCtaEyebrow">
                {t('industries.ctaEyebrow')}
              </span>

              <h3>
                {t('industries.ctaTitle')}
              </h3>

              <LocalizedLink to="/contact">
                {t('industries.ctaLink')}
                <Arrow />
              </LocalizedLink>
            </div>

          </article>

        </div>

      </div>
    </section>
  );
}
