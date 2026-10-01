const facilities = [
  {
    index: '01',
    city: 'Mersin',
    title: 'Primary Production Facility',
    description:
      'A core manufacturing location supporting large-scale polyethylene production, industrial storage solutions and application-specific manufacturing.',
    meta: ['Production', 'Engineering', 'Industrial'],
  },
  {
    index: '02',
    city: 'Istanbul',
    title: 'Production & Operations Facility',
    description:
      'A strategic production and operational location supporting manufacturing, customer requirements and regional industrial demand.',
    meta: ['Production', 'Operations', 'Customer Support'],
  },
];

export default function FacilitiesSection() {
  return (
    <section className="facilitiesSection" id="facilities">
      <div className="container">

        <div className="facilitiesHeader">
          <div>
            <span className="sectionIndex">
              07 / FACILITIES
            </span>

            <p className="eyebrow">
              PRODUCTION NETWORK
            </p>
          </div>

          <div>
            <h2>
              Manufacturing
              <span>where it matters.</span>
            </h2>

            <p>
              RMA operates through production facilities in Mersin and
              Istanbul, combining manufacturing infrastructure with regional
              access and industrial capability.
            </p>
          </div>
        </div>

        <div className="facilitiesGrid">

          {facilities.map((facility) => (
            <article
              className="facilityCard"
              key={facility.city}
            >
              <div className="facilityMedia">

                <div className="facilityMediaTop">
                  <span>
                    {facility.index}
                  </span>

                  <span>
                    RMA / TÜRKİYE
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
                  FACTORY IMAGE / VIDEO
                </span>

              </div>

              <div className="facilityContent">

                <div className="facilityTitleRow">
                  <div>
                    <span className="facilityCountry">
                      TÜRKİYE
                    </span>

                    <h3>
                      {facility.city}
                    </h3>
                  </div>

                  <span className="facilityArrow">
                    ↗
                  </span>
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
            Two locations.
            <br />
            One manufacturing standard.
          </p>

          <a href="#contact">
            Contact Our Team
            <span>↗</span>
          </a>

        </div>

      </div>
    </section>
  );
}