import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';
import { machineIcons } from '../data/customMolding';
import { EcoBadge } from '../components/ui/EcoMarks';

// Grinders crush production scrap for reuse (brochure p. 5–6)
const RECYCLING_MACHINE = 4;

const pad = (n) => String(n).padStart(2, '0');

/*
  Home: machinery fleet (brochure page 5). Key capacity figures on top,
  then a machine list; the selected machine is shown large on the side.
  On phones every machine opens up in the list instead.
*/
export default function MachineParkSection({ index }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);

  const items = t('machinePark.items', { returnObjects: true });
  const machines = Array.isArray(items) ? items : [];
  const highlights = t('machinePark.highlights', { returnObjects: true });

  const current = machines[active];
  const CurrentIcon = machineIcons[active % machineIcons.length];

  return (
    <section className="machinePark" id="machinery">
      <div className="container">

        <div className="machineParkHeader">
          <div>
            {index !== false && <span className="sectionIndex light">{index || t('machinePark.index')}</span>}
            <p className="eyebrow">{t('machinePark.eyebrow')}</p>

            <h2>
              {t('machinePark.title')}
              <span>{t('machinePark.titleAccent')}</span>
            </h2>

            <p className="machineParkText">{t('machinePark.text')}</p>
          </div>

          <dl className="machineParkHighlights">
            {Array.isArray(highlights) &&
              highlights.map((item) => (
                <div key={item.label}>
                  <dt>{item.value}</dt>
                  <dd>{item.label}</dd>
                </div>
              ))}
          </dl>
        </div>

        <div className="machineParkBody">
          <ul className="machineParkList" aria-label={t('machinePark.selectLabel')}>
            {machines.map((machine, index) => {
              const Icon = machineIcons[index % machineIcons.length];
              const selected = index === active;

              return (
                <li key={machine.name} className={selected ? 'active' : ''}>
                  <button
                    type="button"
                    className="machineParkItem"
                    aria-pressed={selected}
                    aria-controls="machine-park-panel"
                    onClick={() => setActive(index)}
                    onMouseEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                  >
                    <span className="machineParkItemIndex">{pad(index + 1)}</span>
                    <span className="machineParkItemIcon" aria-hidden="true">
                      <Icon />
                    </span>
                    <strong>{machine.name}</strong>
                    <span className="machineParkItemCount">
                      {machine.count ? `${machine.count} ${t('machinePark.countLabel')}` : t('machinePark.workshop')}
                    </span>
                  </button>

                  {/* Phones: details right under the machine */}
                  <div className="machineParkItemDetails">
                    <span className="machineParkSpec">{machine.spec}</span>
                    <p>{machine.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {current && (
            <div className="machineParkPanel" id="machine-park-panel" aria-live="polite">
              <div className="machineParkVisual" aria-hidden="true">
                <span className="machineParkRing one" />
                <span className="machineParkRing two" />
                <span key={active} className="machineParkVisualIcon">
                  <CurrentIcon />
                </span>
              </div>

              <div key={`text-${active}`} className="machineParkPanelText">
                <span className="machineParkPanelIndex">
                  {pad(active + 1)}
                  <small> / {pad(machines.length)}</small>
                </span>

                <h3>
                  {current.count && <span className="machineParkPanelCount">{current.count}</span>}
                  {current.name}
                </h3>

                <span className="machineParkSpec">{current.spec}</span>
                <p>{current.text}</p>
                {active === RECYCLING_MACHINE && <EcoBadge type="noWaste" tone="glass" withText />}
              </div>

              <LocalizedLink to="/custom-molding" className="machineParkLink">
                {t('machinePark.link')}
                <Arrow />
              </LocalizedLink>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
