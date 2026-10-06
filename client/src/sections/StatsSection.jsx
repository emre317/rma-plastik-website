import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DraftingCompass, FlaskConical, Globe2, Layers } from 'lucide-react';

/*
  "02 / Kurumsal – Üretim deneyimi", adapted from the "IntegrationShowcase" block:
  a title with one hand-underlined phrase (wrap it in ~tildes~ in the text),
  key figures on the side and a staggered grid of capabilities with icons.
*/

const CAPABILITY_ICONS = [Layers, FlaskConical, DraftingCompass, Globe2];

/* "Üretim ~deneyimini~ taşıyoruz" -> text with the ~part~ underlined */
function HighlightedTitle({ text }) {
  const parts = String(text).split('~');

  return (
    <h2 className="statsTitle">
      {parts.map((part, index) =>
        index === 1 ? (
          <span key={index} className="statsHighlight">
            <span>{part}</span>
            <svg aria-hidden="true" viewBox="0 0 418 42" preserveAspectRatio="none">
              <path
                d="M203.371.916c-26.013-2.078-76.686 1.98-114.243 8.919-37.556 6.939-78.622 17.103-122.256 28.703-43.633 11.6-4.984 14.306 43.123 7.021 48.107-7.285 93.638-16.096 146.446-17.742 52.808-1.646 105.706 5.429 158.649 14.13 52.943 8.701 105.886 19.342 158.826 29.483 52.94 10.141 52.94 10.141-11.41-19.043C371.18 14.363 322.753 5.488 281.339 2.143 239.925-1.201 203.371.916 203.371.916z"
                fill="currentColor"
              />
            </svg>
          </span>
        ) : (
          part
        )
      )}
    </h2>
  );
}

/* Counts the number in "1000+" / "25+" up once visible; years stay as they are */
function CountUp({ value, active }) {
  const match = String(value).match(/^(\D*)([\d.,]+)(.*)$/);
  const target = match ? Number(match[2].replace(/[.,]/g, '')) : NaN;
  const isYear = target >= 1900 && target <= 2100 && match?.[2].length === 4;
  const animate = match && Number.isFinite(target) && !isYear;

  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!animate || !active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const separator = match[2].includes('.') ? '.' : match[2].includes(',') ? ',' : '';
    const format = (n) => (separator ? n.toLocaleString('de-DE').replace(/\./g, separator) : String(n));
    const start = performance.now();
    const duration = 1400;
    let frame;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setShown(`${match[1]}${format(Math.round(target * eased))}${match[3]}`);

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, value]);

  return <>{shown}</>;
}

export default function StatsSection() {
  const { t } = useTranslation();
  const sectionRef = useRef(null);
  const [inView, setInView] = useState(false);

  const stats = t('stats.items', { returnObjects: true });
  const capabilities = t('stats.capabilities', { returnObjects: true });

  useEffect(() => {
    const element = sectionRef.current;

    if (!element || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <section className={`statsSection statsShowcase ${inView ? 'inView' : ''}`} id="company" ref={sectionRef}>
      <div className="container">

        <div className="statsShowcaseHeader">
          <div className="statsShowcaseText">
            <span className="sectionIndex">{t('stats.index')}</span>
            <p className="eyebrow">{t('stats.eyebrow')}</p>

            <HighlightedTitle text={t('stats.title')} />

            <p className="statsSubtitle">{t('stats.description')}</p>
          </div>

          <dl className="statsFigures">
            {Array.isArray(stats) &&
              stats.map((stat, index) => (
                <div key={stat.label} className="statsFigure" style={{ '--i': index }}>
                  <dt>
                    <CountUp value={stat.value} active={inView} />
                  </dt>
                  <dd>
                    <strong>{stat.label}</strong>
                    <span>{stat.detail}</span>
                  </dd>
                </div>
              ))}
          </dl>
        </div>

        {Array.isArray(capabilities) && (
          <ul className="statsCapabilities">
            {capabilities.map((item, index) => {
              const Icon = CAPABILITY_ICONS[index % CAPABILITY_ICONS.length];

              return (
                <li key={item.title} className="statsCapability" style={{ '--i': index }}>
                  <span className="statsCapabilityIcon" aria-hidden="true">
                    <Icon />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      </div>
    </section>
  );
}
