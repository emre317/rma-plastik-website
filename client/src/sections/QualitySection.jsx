import { useTranslation } from 'react-i18next';

import Arrow from '../components/i18n/Arrow';

export default function QualitySection() {
  const { t } = useTranslation();

  const qualityItems = t('quality.items', { returnObjects: true });
  const statement = t('quality.statement', { returnObjects: true });

  return (
    <section className="qualitySection" id="quality">
      <div className="container">

        <div className="qualityHeader">

          <div>
            <span className="sectionIndex">
              {t('quality.index')}
            </span>

            <p className="eyebrow">
              {t('quality.eyebrow')}
            </p>
          </div>

          <div>
            <h2>
              {t('quality.title')}
              <span>{t('quality.titleAccent')}</span>
            </h2>

            <p>
              {t('quality.description')}
            </p>
          </div>

        </div>

        <div className="qualityLayout">

          <div className="qualityStatement">

            <span className="qualityStatementLabel">
              {t('quality.statementLabel')}
            </span>

            <strong>
              {statement.map((line, index) => (
                <span key={line}>
                  {index > 0 && <br />}
                  {line}
                </span>
              ))}
            </strong>

            <p>
              {t('quality.statementText')}
            </p>

          </div>

          <div className="qualityList">

            {qualityItems.map((item, index) => (
              <article key={item.title}>

                <span className="qualityNumber">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div>
                  <h3>
                    {item.title}
                  </h3>

                  <p>
                    {item.description}
                  </p>
                </div>

                <Arrow className="qualityArrow" />

              </article>
            ))}

          </div>

        </div>

      </div>
    </section>
  );
}
