const qualityItems = [
  {
    number: '01',
    title: 'Controlled Production',
    description:
      'Structured manufacturing processes focused on repeatability, product consistency and reliable industrial performance.',
  },
  {
    number: '02',
    title: 'Material Focus',
    description:
      'Polyethylene-based production built around application requirements, durability and long-term use.',
  },
  {
    number: '03',
    title: 'Technical Validation',
    description:
      'Product requirements are reviewed through dimensions, application criteria and manufacturing feasibility.',
  },
];

export default function QualitySection() {
  return (
    <section className="qualitySection" id="quality">
      <div className="container">

        <div className="qualityHeader">

          <div>
            <span className="sectionIndex">
              08 / QUALITY
            </span>

            <p className="eyebrow">
              BUILT INTO THE PROCESS
            </p>
          </div>

          <div>
            <h2>
              Quality is not
              <span>an extra step.</span>
            </h2>

            <p>
              It is integrated into how products are developed, manufactured
              and prepared for industrial use.
            </p>
          </div>

        </div>

        <div className="qualityLayout">

          <div className="qualityStatement">

            <span className="qualityStatementLabel">
              RMA MANUFACTURING STANDARD
            </span>

            <strong>
              Designed.
              <br />
              Manufactured.
              <br />
              Controlled.
            </strong>

            <p>
              From production planning to final manufacturing, each stage
              contributes to consistent and dependable product performance.
            </p>

          </div>

          <div className="qualityList">

            {qualityItems.map((item) => (
              <article key={item.number}>

                <span className="qualityNumber">
                  {item.number}
                </span>

                <div>
                  <h3>
                    {item.title}
                  </h3>

                  <p>
                    {item.description}
                  </p>
                </div>

                <span className="qualityArrow">
                  ↗
                </span>

              </article>
            ))}

          </div>

        </div>

      </div>
    </section>
  );
}