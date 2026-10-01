const technologies = [
  {
    index: '01',
    title: 'Rotational\nMoulding',
    description:
      'High-capacity polyethylene manufacturing for tanks, industrial containers and large-format applications.',
    meta: 'LARGE FORMAT / DURABLE / INDUSTRIAL',
  },
  {
    index: '02',
    title: 'Injection\nMoulding',
    description:
      'Repeatable manufacturing for high-volume components requiring consistent geometry and performance.',
    meta: 'PRECISION / SCALE / CONSISTENCY',
  },
  {
    index: '03',
    title: 'Blow\nMoulding',
    description:
      'Efficient production technology for hollow polyethylene products and application-specific components.',
    meta: 'HOLLOW PRODUCTS / EFFICIENT / FLEXIBLE',
  },
];

export default function TechnologySection() {
  return (
    <section className="technologySection dark" id="technologies">

      <div className="container">

        <div className="technologyHeader">

          <div>
            <span className="sectionIndex light">
              03 / TECHNOLOGIES
            </span>

            <p className="eyebrow">
              MANUFACTURING CAPABILITIES
            </p>
          </div>

          <h2>
            Built around
            <span>the process.</span>
          </h2>

        </div>

        <div className="technologyGrid">

          {technologies.map((technology) => (
            <article
              className="technologyCard"
              key={technology.index}
            >

              <div className="technologyCardTop">

                <span className="technologyNumber">
                  {technology.index}
                </span>

                <span className="technologyArrow">
                  ↗
                </span>

              </div>

              <div className="technologyVisual">

                <div className="technologyShape">
                  <div />
                  <div />
                  <div />
                </div>

              </div>

              <div className="technologyContent">

                <h3>
                  {technology.title
                    .split('\n')
                    .map((line) => (
                      <span key={line}>
                        {line}
                      </span>
                    ))}
                </h3>

                <p>
                  {technology.description}
                </p>

              </div>

              <div className="technologyMeta">
                {technology.meta}
              </div>

            </article>
          ))}

        </div>

        <div className="technologyFooter">

          <p>
            Different processes.
            <br />
            One manufacturing standard.
          </p>

          <a href="#engineering">
            Explore Our Capabilities
            <span>↗</span>
          </a>

        </div>

      </div>

    </section>
  );
}