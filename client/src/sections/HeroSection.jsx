import { useTranslation } from 'react-i18next';

import Arrow from '../components/i18n/Arrow';
import { useQuote } from '../components/quote/QuoteContext';
import videos from '../data/videos';
import HeroVideo from './HeroVideo';
import { EcoBadge } from '../components/ui/EcoMarks';

export default function HeroSection() {
  const { t } = useTranslation();
  const { openQuote } = useQuote();

  const visualTop = t('hero.visualTop', { returnObjects: true });

  // The first video (lowest order in the admin panel) becomes the opening film
  if (videos[0]) {
    return <HeroVideo video={videos[0]} />;
  }

  return (
    <section className="hero" id="home">
      <div className="container heroContainer">

        <div className="heroTop">
          <span className="heroIndex">{t('hero.index')}</span>

          <span className="heroTopRight">
            <EcoBadge type="solar" />
            <span className="heroSince">
              {t('hero.since')}
            </span>
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

              <button
                type="button"
                className="button ghost"
                onClick={() => openQuote()}
              >
                <span>{t('hero.requestSolution')}</span>
                <Arrow className="buttonArrow" />
              </button>

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
