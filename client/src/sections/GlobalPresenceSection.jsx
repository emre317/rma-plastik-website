import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';
import ExportMap from '../components/ui/ExportMap';
import exportMap from '../data/exportMap';

export default function GlobalPresenceSection() {
  const { t } = useTranslation();

  // Hovering a country in the list or on the map highlights its route
  const [activeKey, setActiveKey] = useState(null);

  const labels = t('global.countries', { returnObjects: true });

  return (
    <section className="globalSection dark" id="global">
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
              activeKey={activeKey}
              onActiveChange={setActiveKey}
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

              {exportMap.destinations.map((destination, index) => (
                <li
                  key={destination.key}
                  className={activeKey === destination.key ? 'active' : ''}
                  onMouseEnter={() => setActiveKey(destination.key)}
                  onMouseLeave={() => setActiveKey(null)}
                >
                  <span>
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <strong>
                    {labels[destination.key].name}
                  </strong>
                </li>
              ))}

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
