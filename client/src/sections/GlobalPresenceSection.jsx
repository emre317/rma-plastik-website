import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import { Globe } from 'lucide-react';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';
import ExportMap from '../components/ui/ExportMap';
import exportMap from '../data/exportMap';

// Each country (and finally "worldwide") appears this far apart
const STEP_MS = 3000;

const destinations = exportMap.destinations;
const WORLDWIDE_STEP = destinations.length;

/*
  One shared sequence drives both the country list and the map:
  step 0..n-1  → country n appears in the list and its route is drawn
  step n       → "worldwide" row appears and the map zooms out
  then the sequence starts again.
*/
export default function GlobalPresenceSection() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const sectionRef = useRef(null);

  const [inView, setInView] = useState(false);
  const [step, setStep] = useState(-1);
  const [cycle, setCycle] = useState(0);
  const [hoverKey, setHoverKey] = useState(null);

  // Start the sequence the first time the section scrolls into view,
  // and pause it while it is off-screen
  useEffect(() => {
    const element = sectionRef.current;

    if (!element || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.35 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (inView && step === -1) {
      setStep(0);
    }
  }, [inView, step]);

  useEffect(() => {
    if (reduceMotion || !inView || hoverKey || step === -1) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (step >= WORLDWIDE_STEP) {
        setStep(0);
        setCycle((value) => value + 1);
      } else {
        setStep(step + 1);
      }
    }, STEP_MS);

    return () => clearTimeout(timer);
  }, [step, inView, hoverKey, reduceMotion]);

  // Reduced motion: show everything at once, no sequence
  const currentStep = reduceMotion ? WORLDWIDE_STEP : step;

  const revealedCount = Math.min(currentStep + 1, destinations.length);
  const sequenceKey =
    currentStep >= 0 && currentStep < WORLDWIDE_STEP
      ? destinations[currentStep].key
      : null;

  const activeKey = hoverKey || (reduceMotion ? null : sequenceKey);
  const worldwideVisible = currentStep >= WORLDWIDE_STEP;
  const worldwideActive = worldwideVisible && !hoverKey && !reduceMotion;

  const labels = t('global.countries', { returnObjects: true });
  const controlLabels = t('global.controls', { returnObjects: true });

  return (
    <section className="globalSection dark" id="global" ref={sectionRef}>
      <div className="container">

        <div className="globalHeader">

          <div>
            <span className="sectionIndex light">
              {t('global.index')}
            </span>

            <p className="eyebrow">
              {t('global.eyebrow')}
            </p>
          </div>

          <div>
            <h2>
              {t('global.title')}
              <span>{t('global.titleAccent')}</span>
            </h2>
          </div>

        </div>

        <div className="globalGrid">

          <figure className="globalMap" aria-label={t('global.mapLabel')}>
            <ExportMap
              data={exportMap}
              hubLabel={t('global.hub')}
              hubShortLabel={t('global.hubShort')}
              labels={labels}
              controlLabels={controlLabels}
              revealedCount={revealedCount}
              activeKey={activeKey}
              autoView={worldwideActive ? 'world' : 'focus'}
              cycle={cycle}
              onHoverChange={setHoverKey}
            />
          </figure>

          <div className="globalContent">

            <span className="globalLabel">
              {t('global.label')}
            </span>

            <p>
              {t('global.text')}
            </p>

            <ul className="regionList">

              <li className="regionHub">
                <span>00</span>
                <strong>{t('global.hubRow')}</strong>
                <em>{t('global.hubRowTag')}</em>
              </li>

              {destinations.map((destination, index) => {
                const revealed = index < revealedCount;

                return (
                  <li
                    key={destination.key}
                    className={[
                      'regionItem',
                      revealed ? 'revealed' : '',
                      activeKey === destination.key ? 'active' : '',
                    ].join(' ')}
                    aria-hidden={!revealed}
                    onMouseEnter={revealed ? () => setHoverKey(destination.key) : undefined}
                    onMouseLeave={revealed ? () => setHoverKey(null) : undefined}
                  >
                    <span>
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <strong>
                      {labels[destination.key].name}
                    </strong>
                  </li>
                );
              })}

              <li
                className={[
                  'regionItem',
                  'regionWorldwide',
                  worldwideVisible ? 'revealed' : '',
                  worldwideActive ? 'active' : '',
                ].join(' ')}
                aria-hidden={!worldwideVisible}
              >
                <span>
                  <Globe aria-hidden="true" />
                </span>

                <strong>{t('global.worldwide')}</strong>
              </li>

            </ul>

            <LocalizedLink to="/contact" className="globalLink">
              {t('global.discuss')}
              <Arrow />
            </LocalizedLink>

          </div>

        </div>

      </div>
    </section>
  );
}
