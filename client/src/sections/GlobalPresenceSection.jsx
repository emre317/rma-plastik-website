import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';

export default function GlobalPresenceSection() {
  const { t } = useTranslation();

  const regions = t('global.regions', { returnObjects: true });

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

          {/* Map keeps geographic orientation in every language */}
          <div className="globalMap" dir="ltr">

            <div className="mapGrid" />

            <div className="mapOrigin">
              <span className="mapPulse" />
              <strong>TR</strong>
              <small>{t('global.origin')}</small>
            </div>

            <span className="mapPoint pointEurope">
              {t('global.points.europe')}
            </span>

            <span className="mapPoint pointMiddleEast">
              {t('global.points.middleEast')}
            </span>

            <span className="mapPoint pointAfrica">
              {t('global.points.africa')}
            </span>

            <span className="mapPoint pointAsia">
              {t('global.points.asia')}
            </span>

            <div className="mapLine lineEurope" />
            <div className="mapLine lineMiddleEast" />
            <div className="mapLine lineAfrica" />
            <div className="mapLine lineAsia" />

          </div>

          <div className="globalContent">

            <span className="globalLabel">
              {t('global.label')}
            </span>

            <p>
              {t('global.text')}
            </p>

            <div className="regionList">

              {regions.map((region, index) => (
                <div key={region}>
                  <span>
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <strong>
                    {region}
                  </strong>
                </div>
              ))}

            </div>

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
