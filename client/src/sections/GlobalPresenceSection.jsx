import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import exportMap from '../data/exportMap';

// The interactive map (and its animation library) loads separately, below the fold
const ExportMap = lazy(() => import('../components/ui/ExportMap'));

// Each market (and finally "worldwide") is shown this long
const STEP_MS = 3000;

const destinations = exportMap.destinations;
const WORLDWIDE_STEP = destinations.length;

/*
  One shared sequence drives both the step list and the map:
  step 0..n-1  → market n is highlighted on the map and in the list
  step n       → "worldwide": every market and route lights up together
  then the sequence starts again.
*/
export default function GlobalPresenceSection({ index }) {
  const { t } = useTranslation();
  const reduceMotion = usePrefersReducedMotion();

  const sectionRef = useRef(null);
  const stepsRef = useRef(null);

  const [inView, setInView] = useState(false);
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [hoverKey, setHoverKey] = useState(null);

  // Run only while the section is on screen
  useEffect(() => {
    const element = sectionRef.current;

    if (!element || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.3 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // First time the section appears: restart so visitors see the routes being drawn
  const startedRef = useRef(false);

  useEffect(() => {
    if (inView && !startedRef.current) {
      startedRef.current = true;
      setStep(0);
      setCycle((value) => value + 1);
    }
  }, [inView]);

  const paused = reduceMotion || !inView || Boolean(hoverKey);

  useEffect(() => {
    if (paused) {
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
  }, [step, paused]);

  // Keep the active step visible when the list scrolls sideways (mobile)
  useEffect(() => {
    const list = stepsRef.current;
    const item = list?.children[step];

    if (!list || !item || list.scrollWidth <= list.clientWidth) {
      return;
    }

    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const delta =
      itemRect.left + itemRect.width / 2 - (listRect.left + listRect.width / 2);

    list.scrollBy({ left: delta, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [step, reduceMotion]);

  // Reduced motion: everything visible at once, no sequence
  const currentStep = reduceMotion ? WORLDWIDE_STEP : step;
  const worldwideActive = currentStep >= WORLDWIDE_STEP && !hoverKey;

  const activeKey =
    hoverKey ||
    (currentStep < WORLDWIDE_STEP ? destinations[currentStep].key : null);

  const isRevealed = (key) =>
    key === hoverKey ||
    destinations.findIndex((d) => d.key === key) <= currentStep;

  const labels = t('global.countries', { returnObjects: true });
  const figures = t('global.figures', { returnObjects: true });

  const stepState = (index) => {
    if (hoverKey) {
      return destinations[index]?.key === hoverKey ? 'active' : 'done';
    }

    if (index === currentStep && !reduceMotion) {
      return 'active';
    }

    return index < currentStep || reduceMotion ? 'done' : 'upcoming';
  };

  const hoverProps = (key) => ({
    onMouseEnter: () => setHoverKey(key),
    onMouseLeave: () => setHoverKey(null),
    onFocus: () => setHoverKey(key),
    onBlur: () => setHoverKey(null),
  });

  return (
    <section className="globalSection dark" id="global" ref={sectionRef}>
      <div className="container">

        <div className="globalHeader globalHeaderShowcase">

          <div className="globalHeaderIntro">
            {index !== false && (
              <span className="sectionIndex light">
                {index || t('global.index')}
              </span>
            )}

            <p className="eyebrow">
              {t('global.eyebrow')}
            </p>

            <h2>
              {t('global.title')}
              <span>{t('global.titleAccent')}</span>
            </h2>

            <p className="globalIntro">
              {t('global.text')}
            </p>
          </div>

          <aside className="globalMeta">
            <dl className="globalFigures">
              {figures.map((figure) => (
                <div key={figure.label}>
                  <dt>{figure.value}</dt>
                  <dd>{figure.label}</dd>
                </div>
              ))}
            </dl>

            <LocalizedLink to="/contact" className="button primary">
              <span>{t('global.discuss')}</span>
              <Arrow className="buttonArrow" />
            </LocalizedLink>
          </aside>

        </div>

        <figure className="exportMapPanel" aria-label={t('global.mapLabel')}>
          <Suspense
            fallback={
              <div
                className="exportMapPlaceholder"
                style={{ aspectRatio: `${exportMap.width} / ${exportMap.height}` }}
              />
            }
          >
          <ExportMap
            data={exportMap}
            labels={labels}
            hubLabel={t('global.hub')}
            hubShortLabel={t('global.hubShort')}
            controlLabels={t('global.controls', { returnObjects: true })}
            legendLabels={t('global.legend', { returnObjects: true })}
            isRevealed={isRevealed}
            activeKey={activeKey}
            highlightAll={worldwideActive}
            cycle={cycle}
            onHoverChange={setHoverKey}
          />
          </Suspense>
        </figure>

        <div className="exportStepsHeader">
          <span className="globalLabel">
            {t('global.stepsLabel')}
          </span>

        </div>

        <ol className="exportSteps" ref={stepsRef}>

          {destinations.map((destination, index) => {
            const state = stepState(index);
            const label = labels[destination.key];

            return (
              <li key={destination.key}>
                <button
                  type="button"
                  className={`exportStep ${state}`}
                  aria-current={state === 'active' ? 'step' : undefined}
                  {...hoverProps(destination.key)}
                >
                  <span className="exportStepIndex">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <strong>{label.name}</strong>

                  <span className="exportStepRegion">{label.region}</span>

                  <span className="exportStepProgress" aria-hidden="true">
                    {state === 'active' && !hoverKey && !reduceMotion && (
                      <span key={`${cycle}-${index}`} />
                    )}
                  </span>
                </button>
              </li>
            );
          })}

          <li>
            <div
              className={`exportStep exportStepWorld ${
                worldwideActive && !reduceMotion
                  ? 'active'
                  : currentStep >= WORLDWIDE_STEP
                    ? 'done'
                    : 'upcoming'
              }`}
              aria-current={worldwideActive ? 'step' : undefined}
            >
              <span className="exportStepIndex">
                <Globe aria-hidden="true" />
              </span>

              <strong>{t('global.worldwide.name')}</strong>

              <span className="exportStepRegion">
                {t('global.worldwide.region')}
              </span>

              <span className="exportStepProgress" aria-hidden="true">
                {worldwideActive && !reduceMotion && <span key={`${cycle}-world`} />}
              </span>
            </div>
          </li>

        </ol>

      </div>
    </section>
  );
}
