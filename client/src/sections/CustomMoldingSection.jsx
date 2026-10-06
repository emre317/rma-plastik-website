import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';
import { projectImages, serviceIcons } from '../data/customMolding';

/*
  Home: custom molding teaser – intro with key figures on one side,
  the reference projects and the service list on the other.
*/
export default function CustomMoldingSection() {
  const { t } = useTranslation();

  const figures = t('customMolding.figures', { returnObjects: true });
  const projects = t('pages.customMolding.projects', { returnObjects: true });
  const services = t('pages.customMolding.services', { returnObjects: true });

  return (
    <section className="cmHome" id="custom-molding">
      <div className="container">
        <div className="cmHomeGrid">

          <div className="cmHomeIntro">
            <span className="sectionIndex">{t('customMolding.index')}</span>
            <p className="eyebrow">{t('customMolding.eyebrow')}</p>

            <h2>
              {t('customMolding.title')}
              <span>{t('customMolding.titleAccent')}</span>
            </h2>

            <p className="cmHomeText">{t('customMolding.text')}</p>

            <dl className="cmFigures">
              {Array.isArray(figures) &&
                figures.map((figure) => (
                  <div key={figure.label}>
                    <dt>{figure.value}</dt>
                    <dd>{figure.label}</dd>
                  </div>
                ))}
            </dl>

            <LocalizedLink to="/custom-molding" className="button primary">
              <span>{t('customMolding.link')}</span>
              <Arrow className="buttonArrow" />
            </LocalizedLink>
          </div>

          <div className="cmHomeVisual">
            <p className="cmLabel">{t('customMolding.referencesLabel')}</p>

            <ul className="cmHomeProjects">
              {Array.isArray(projects) &&
                projects.map((project, index) => (
                  <li key={project.client} className="cmHomeProject" style={{ '--i': index }}>
                    <span className="cmDisc">
                      <img src={projectImages[index]} alt="" loading="lazy" decoding="async" width="400" height="400" />
                    </span>
                    <span className="cmHomeProjectText">
                      <strong>{project.client}</strong>
                      <span>{project.title}</span>
                    </span>
                  </li>
                ))}
            </ul>

            <ul className="cmServiceChips">
              {Array.isArray(services) &&
                services.map((service, index) => {
                  const Icon = serviceIcons[index % serviceIcons.length];

                  return (
                    <li key={service}>
                      <Icon aria-hidden="true" />
                      {service}
                    </li>
                  );
                })}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
