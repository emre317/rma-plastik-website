import { useTranslation } from 'react-i18next';

import Arrow from '../components/i18n/Arrow';
import { useQuote } from '../components/quote/QuoteContext';
import videos from '../data/videos';
import HeroVideo from './HeroVideo';
import HeroTitle from '../components/ui/HeroTitle';
import HeroBrand from '../components/ui/HeroBrand';
import HeroTypeLine from '../components/ui/HeroTypeLine';
import HeroStats from '../components/ui/HeroStats';

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

        <div className="heroGrid">

          <div className="heroContent">

            <HeroBrand className="light" />

            <HeroTitle line1={t('hero.titleLine1')} accent={t('hero.titleAccent')} line2={t('hero.titleLine2')} />

            <HeroTypeLine />

            <p className="lead">
              {t('hero.lead')}
            </p>

            <div className="actions">

              <a
                className="button heroExplore"
                href="#products"
              >
                <span>{t('hero.exploreProducts')}</span>
                <Arrow className="buttonArrow" />
              </a>

              <button
                type="button"
                className="button primary heroQuoteCta"
                onClick={() => openQuote()}
              >
                <span>{t('hero.requestSolution')}</span>
                <Arrow className="buttonArrow" />
              </button>

            </div>

            <HeroStats />

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
