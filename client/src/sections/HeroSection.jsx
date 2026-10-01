import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';

export default function HeroSection() {
  const { t } = useTranslation();

  const visualTop = t('hero.visualTop', { returnObjects: true });

  return (
    <section className="hero" id="home">
      <div className="container heroContainer">

        <div className="heroTop">
          <span className="heroIndex">{t('hero.index')}</span>

          <span className="heroSince">
            {t('hero.since')}
          </span>
        </div>

        <div className="heroGrid">

          <div className="heroContent">

            <p className="eyebrow">
              {t('hero.eyebrow')}
            </p>

            <h1>
              {t('hero.titleLine1')}
              <span>{t('hero.titleAccent')}</span>
              {t('hero.titleLine2')}
            </h1>

            <p className="lead">
              {t('hero.lead')}
            </p>

            <div className="actions">

              <a
                className="button primary"
                href="#products"
              >
                <span>{t('hero.exploreProducts')}</span>
                <Arrow className="buttonArrow" />
              </a>

              <LocalizedLink
                className="button ghost"
                to="/contact"
              >
                <span>{t('hero.requestSolution')}</span>
                <Arrow className="buttonArrow" />
              </LocalizedLink>

            </div>

          </div>

          <div className="heroVisual">

            <div className="heroVisualTop">
              {visualTop.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            <div className="tankVisual">

              <div className="tankTop" />

              <div className="tankBody">

                <div className="tankLine tankLineOne" />
                <div className="tankLine tankLineTwo" />
                <div className="tankLine tankLineThree" />

              </div>

            </div>

            <div className="heroVisualBottom">

              <div>
                <span className="visualLabel">
                  {t('hero.productionRange')}
                </span>

                <strong>
                  {t('hero.productionRangeValue')}
                </strong>
              </div>

              <span className="visualNumber">
                RMA / 01
              </span>

            </div>

          </div>

        </div>

        <div className="heroBottom">

          <span>
            {t('common.locations')}
          </span>

          <span>
            {t('hero.scroll')}
          </span>

        </div>

      </div>
    </section>
  );
}
