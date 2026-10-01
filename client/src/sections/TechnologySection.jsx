import { useTranslation } from 'react-i18next';

import Arrow from '../components/i18n/Arrow';

export default function TechnologySection() {
  const { t } = useTranslation();

  const technologies = t('technology.items', { returnObjects: true });
  const footer = t('technology.footer', { returnObjects: true });

  return (
    <section className="technologySection dark" id="technologies">

      <div className="container">

        <div className="technologyHeader">

          <div>
            <span className="sectionIndex light">
              {t('technology.index')}
            </span>

            <p className="eyebrow">
              {t('technology.eyebrow')}
            </p>
          </div>

          <h2>
            {t('technology.title')}
            <span>{t('technology.titleAccent')}</span>
          </h2>

        </div>

        <div className="technologyGrid">

          {technologies.map((technology, index) => (
            <article
              className="technologyCard"
              key={technology.title.join(' ')}
            >

              <div className="technologyCardTop">

                <span className="technologyNumber">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <Arrow className="technologyArrow" />

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
                  {technology.title.map((line) => (
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
            {footer[0]}
            <br />
            {footer[1]}
          </p>

          <a href="#engineering">
            {t('technology.explore')}
            <Arrow />
          </a>

        </div>

      </div>

    </section>
  );
}
