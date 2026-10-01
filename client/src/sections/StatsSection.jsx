import { useTranslation } from 'react-i18next';

export default function StatsSection() {
  const { t } = useTranslation();

  const stats = t('stats.items', { returnObjects: true });

  return (
    <section className="statsSection" id="company">
      <div className="container">

        <div className="sectionIntro statsIntro">
          <div>
            <span className="sectionIndex">{t('stats.index')}</span>
            <p className="eyebrow">{t('stats.eyebrow')}</p>
          </div>

          <p className="sectionDescription">
            {t('stats.description')}
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
