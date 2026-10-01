import { Link } from 'react-router-dom';

const regions = [
  'Europe',
  'Middle East',
  'North Africa',
  'Central Asia',
  'Türkiye',
];

export default function GlobalPresenceSection() {
  return (
    <section className="globalSection dark" id="global">
      <div className="container">

        <div className="globalHeader">

          <div>
            <span className="sectionIndex light">
              09 / GLOBAL
            </span>

            <p className="eyebrow">
              GLOBAL REACH
            </p>
          </div>

          <div>
            <h2>
              Manufactured in Türkiye.
              <span>Built for industry worldwide.</span>
            </h2>
          </div>

        </div>

        <div className="globalGrid">

          <div className="globalMap">

            <div className="mapGrid" />

            <div className="mapOrigin">
              <span className="mapPulse" />
              <strong>TR</strong>
              <small>MERSIN / ISTANBUL</small>
            </div>

            <span className="mapPoint pointEurope">
              EU
            </span>

            <span className="mapPoint pointMiddleEast">
              ME
            </span>

            <span className="mapPoint pointAfrica">
              NA
            </span>

            <span className="mapPoint pointAsia">
              CA
            </span>

            <div className="mapLine lineEurope" />
            <div className="mapLine lineMiddleEast" />
            <div className="mapLine lineAfrica" />
            <div className="mapLine lineAsia" />

          </div>

          <div className="globalContent">

            <span className="globalLabel">
              MARKETS & APPLICATIONS
            </span>

            <p>
              RMA's production base in Türkiye provides access to multiple
              industrial markets and regional supply routes.
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

            <Link to="/contact" className="globalLink">
              Discuss Your Requirement
              <span>↗</span>
            </Link>

          </div>

        </div>

      </div>
    </section>
  );
}