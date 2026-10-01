const stats = [
  {
    value: '1998',
    label: 'Established',
    detail: 'More than two decades of manufacturing experience.',
  },
  {
    value: '2',
    label: 'Production Facilities',
    detail: 'Manufacturing operations in Mersin and Istanbul.',
  },
  {
    value: '42,000 L',
    label: 'Production Range',
    detail: 'Polyethylene solutions across a wide capacity range.',
  },
  {
    value: '25+',
    label: 'Years of Experience',
    detail: 'Industrial know-how developed through continuous production.',
  },
];

export default function StatsSection() {
  return (
    <section className="statsSection" id="company">
      <div className="container">

        <div className="sectionIntro statsIntro">
          <div>
            <span className="sectionIndex">02 / COMPANY</span>
            <p className="eyebrow">MANUFACTURING EXPERIENCE</p>
          </div>

          <p className="sectionDescription">
            RMA combines production expertise, industrial infrastructure and
            application-focused manufacturing for demanding polyethylene
            solutions.
          </p>
        </div>

        <div className="statGrid">
          {stats.map((stat, index) => (
            <article className="stat" key={stat.label}>
              <span className="statIndex">
                {String(index + 1).padStart(2, '0')}
              </span>

              <strong>{stat.value}</strong>

              <span className="statLabel">{stat.label}</span>

              <p>{stat.detail}</p>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}