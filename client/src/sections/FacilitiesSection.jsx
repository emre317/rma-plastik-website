import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';

export default function FacilitiesSection() {
  const { t } = useTranslation();

  const facilities = t('facilities.items', { returnObjects: true });
  const bottom = t('facilities.bottom', { returnObjects: true });

  return (
    <section className="facilitiesSection" id="facilities">
      <div className="container">

        <div className="facilitiesHeader">
          <div>
            <span className="sectionIndex">
              {t('facilities.index')}
            </span>

            <p className="eyebrow">
              {t('facilities.eyebrow')}
            </p>
          </div>

          <div>
            <h2>
              {t('facilities.title')}
              <span>{t('facilities.titleAccent')}</span>
            </h2>

            <p>
              {t('facilities.description')}
            </p>
          </div>
        </div>

        <div className="facilitiesGrid">

          {facilities.map((facility, index) => (
            <article
              className="facilityCard"
              key={facility.city}
            >
              <div className="facilityMedia">

                <div className="facilityMediaTop">
                  <span>
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span>
                    {t('facilities.mediaTag')}
                  </span>
                </div>

                <div className="facilityBuilding">

                  <div className="facilityBuildingRoof" />

                  <div className="facilityBuildingBody">

                    <div className="facilityDoor" />

                    <div className="facilityWindow facilityWindowOne" />
                    <div className="facilityWindow facilityWindowTwo" />
                    <div className="facilityWindow facilityWindowThree" />

                  </div>

                </div>

                <span className="facilityPlaceholderLabel">
                  {t('facilities.placeholder')}
                </span>

              </div>

              <div className="facilityContent">

                <div className="facilityTitleRow">
                  <div>
                    <span className="facilityCountry">
                      {t('facilities.country')}
                    </span>

                    <h3>
                      {facility.city}
                    </h3>
                  </div>

                  <Arrow className="facilityArrow" />
                </div>

                <p>
                  {facility.description}
                </p>

                <div className="facilityMeta">
                  {facility.meta.map((item) => (
                    <span key={item}>
                      {item}
                    </span>
                  ))}
                </div>

              </div>

            </article>
          ))}

        </div>

        <div className="facilitiesBottom">

          <p>
            {bottom[0]}
            <br />
            {bottom[1]}
          </p>

          <LocalizedLink to="/contact">
            {t('facilities.contact')}
            <Arrow />
          </LocalizedLink>

        </div>

      </div>
    </section>
  );
}
