import { useTranslation } from 'react-i18next';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import { SustainabilityBand } from '../../components/ui/EcoMarks';
import { galleryImages, machineIcons, projectImages, serviceIcons } from '../../data/customMolding';

const pad = (n) => String(n).padStart(2, '0');

export default function CustomMolding() {
  const { t } = useTranslation();
  const { openQuote } = useQuote();

  const list = (key) => {
    const value = t(`pages.customMolding.${key}`, { returnObjects: true });
    return Array.isArray(value) ? value : [];
  };
  const text = (key) => t(`pages.customMolding.${key}`);

  const services = list('services');
  const steps = list('steps');
  const machinery = t('machinePark.items', { returnObjects: true });
  const machines = Array.isArray(machinery) ? machinery : [];
  const projects = list('projects');
  const figureList = t('customMolding.figures', { returnObjects: true });
  const figures = Array.isArray(figureList) ? figureList : [];

  return (
    <main className="internalPage cmPage">
      <Seo
        title={t('meta.titles.customMolding')}
        description={t('meta.descriptions.customMolding')}
        breadcrumbs={[{ name: t('meta.titles.customMolding'), path: '/custom-molding' }]}
      />

      {/* Hero */}
      <PageHeader
        crumbs={[{ label: t('nav.customMolding') }]}
        eyebrow={text('eyebrow')}
        title={text('title')}
        accent={text('titleAccent')}
        lead={text('intro')}
        mediaTone="glass"
        media={[
          { src: projectImages[2] },
          { src: projectImages[0] },
          { src: projectImages[1] },
        ]}
        actions={(
          <>
            <button type="button" className="button primary" onClick={() => openQuote()}>
              <span>{text('ctaQuote')}</span>
              <Arrow className="buttonArrow" />
            </button>
            <a href="#references" className="button ghost">
              <span>{text('referencesLabel')}</span>
              <Arrow direction="down" className="buttonArrow" />
            </a>
          </>
        )}
        facts={figures.map((figure) => ({ value: figure.value, label: figure.label }))}
      >
        <div className="phChips">
          <span className="phChipsLabel">{text('methodsLabel')}</span>
          <ul>
            {list('methods').map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
        </div>
      </PageHeader>

      {/* Services */}
      <section className="cmBlock">
        <div className="container">
          <div className="cmBlockHeader">
            <p className="eyebrow">{text('servicesLabel')}</p>
            <span className="cmCount">{pad(services.length)}</span>
          </div>

          <ol className="cmServices">
            {services.map((service, index) => {
              const Icon = serviceIcons[index % serviceIcons.length];

              return (
                <li key={service} className="cmService">
                  <span className="cmServiceIcon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="cmServiceIndex">{pad(index + 1)}</span>
                  <h2>{service}</h2>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Development process */}
      <section className="cmProcess">
        <div className="container">
          <div className="cmSectionHead">
            <p className="eyebrow">{text('processLabel')}</p>
            <h2>
              {text('processTitle')}
              <span>{text('processTitleAccent')}</span>
            </h2>
          </div>

          <ol className="cmSteps">
            {steps.map((step, index) => (
              <li key={step} className="cmStep">
                <span className="cmStepIndex">{pad(index + 1)}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Machinery */}
      <section className="cmBlock">
        <div className="container">
          <div className="cmSectionHead cmSectionHeadSplit">
            <div>
              <p className="eyebrow">{t('machinePark.eyebrow')}</p>
              <h2>
                {t('machinePark.title')}
                <span>{t('machinePark.titleAccent')}</span>
              </h2>
            </div>
            <p className="cmLead">{t('machinePark.text')}</p>
          </div>

          <ul className="cmMachines">
            {machines.map((machine, index) => {
              const Icon = machineIcons[index % machineIcons.length];

              return (
                <li key={machine.name} className="cmMachine">
                  <div className="cmMachineTop">
                    <span className="cmMachineIcon" aria-hidden="true">
                      <Icon />
                    </span>
                    {machine.count && <strong className="cmMachineCount">{machine.count}</strong>}
                  </div>
                  <h3>{machine.name}</h3>
                  <span className="cmMachineSpec">{machine.spec}</span>
                  <p>{machine.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <SustainabilityBand types={['noWaste', 'solar', 'recycle']} />

      {/* References */}
      <section className="cmReferences" id="references">
        <div className="container">
          <div className="cmSectionHead">
            <p className="eyebrow">{text('referencesLabel')}</p>
            <h2>
              {text('referencesTitle')}
              <span>{text('referencesTitleAccent')}</span>
            </h2>
          </div>

          <ul className="cmProjects">
            {projects.map((project, index) => (
              <li key={project.client} className="cmProject">
                <span className="cmDisc cmDiscLarge">
                  <img src={projectImages[index]} alt={project.title} loading="lazy" decoding="async" width="400" height="400" />
                </span>
                <span className="cmProjectIndex">{pad(index + 1)}</span>
                <h3>{project.title}</h3>
                <p>{project.client}</p>
              </li>
            ))}
          </ul>

          <p className="cmLabel cmGalleryLabel">{text('galleryLabel')}</p>

          <ul className="cmGallery">
            {galleryImages.map((src, index) => (
              <li key={src} style={{ '--i': index }}>
                <span className="cmDisc">
                  <img src={src} alt={`${text('galleryAlt')} ${index + 1}`} loading="lazy" decoding="async" width="400" height="400" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="cmCta">
        <div className="container">
          <div className="cmCtaPanel">
            <div>
              <h2>{text('ctaTitle')}</h2>
              <p>{text('ctaText')}</p>
            </div>

            <div className="cmCtaActions">
              <button type="button" className="button primary" onClick={() => openQuote()}>
                <span>{text('ctaQuote')}</span>
                <Arrow className="buttonArrow" />
              </button>
              <LocalizedLink to="/contact" className="cmCtaLink">
                {text('ctaContact')}
                <Arrow />
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
