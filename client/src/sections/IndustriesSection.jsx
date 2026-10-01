const industries = [
  {
    index: '01',
    title: 'Chemical',
    description:
      'Storage and handling solutions designed for demanding chemical applications and process environments.',
  },
  {
    index: '02',
    title: 'Food & Beverage',
    description:
      'Polyethylene solutions suitable for food-related applications, storage and controlled industrial use.',
  },
  {
    index: '03',
    title: 'Agriculture',
    description:
      'Durable products for farming, irrigation, liquid storage and field-based operations.',
  },
  {
    index: '04',
    title: 'Automotive',
    description:
      'Application-specific polyethylene components and production solutions for automotive requirements.',
  },
  {
    index: '05',
    title: 'Textile',
    description:
      'Industrial polyethylene solutions supporting textile production, process and material handling.',
  },
  {
    index: '06',
    title: 'Infrastructure',
    description:
      'Reliable storage and technical solutions for construction, infrastructure and utility applications.',
  },
  {
    index: '07',
    title: 'Marine',
    description:
      'Durable polyethylene products for marine environments and specialized operational requirements.',
  },
];

export default function IndustriesSection() {
  return (
    <section className="industriesSection muted" id="industries">
      <div className="container">

        <div className="industriesHeader">

          <div>
            <span className="sectionIndex">
              05 / INDUSTRIES
            </span>

            <p className="eyebrow">
              APPLICATION SECTORS
            </p>
          </div>

          <div>
            <h2>
              Designed for
              <span>real industries.</span>
            </h2>

            <p>
              RMA develops polyethylene solutions around the operational needs
              of different industries — from chemical storage to agriculture,
              infrastructure and specialized production environments.
            </p>
          </div>

        </div>

        <div className="industriesMatrix">

          {industries.map((industry) => (
            <article
              className="industryItem"
              key={industry.index}
            >
              <div className="industryItemTop">
                <span className="industryIndex">
                  {industry.index}
                </span>

                <span className="industryArrow">
                  ↗
                </span>
              </div>

              <div className="industryItemContent">
                <h3>
                  {industry.title}
                </h3>

                <p>
                  {industry.description}
                </p>
              </div>
            </article>
          ))}

          <article className="industryItem industryItemCta">

            <div className="industryItemTop">
              <span className="industryIndex">
                08
              </span>
            </div>

            <div className="industryItemContent">
              <span className="industryCtaEyebrow">
                YOUR INDUSTRY
              </span>

              <h3>
                Need a custom
                application?
              </h3>

              <a href="#contact">
                Talk to RMA
                <span>↗</span>
              </a>
            </div>

          </article>

        </div>

      </div>
    </section>
  );
}