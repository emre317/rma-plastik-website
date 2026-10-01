import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';

export default function EngineeringSection() {
  const { t } = useTranslation();

  const steps = t('engineering.steps', { returnObjects: true });
  const visualTop = t('engineering.visualTop', { returnObjects: true });

  return (
    <section className="engineeringSection dark" id="engineering">
      <div className="container">

        <div className="engineeringHeader">

          <div>
            <span className="sectionIndex light">
              {t('engineering.index')}
            </span>

            <p className="eyebrow">
              {t('engineering.eyebrow')}
            </p>
          </div>

          <div>
            <h2>
              {t('engineering.title')}
              <span>{t('engineering.titleAccent')}</span>
            </h2>

            <p>
              {t('engineering.description')}
            </p>
          </div>

        </div>

        <div className="engineeringGrid">

          <div className="engineeringContent">

            <div className="engineeringIntro">
              <span className="engineeringSmallLabel">
                {t('engineering.introLabel')}
              </span>

              <p>
                {t('engineering.intro')}
              </p>
            </div>

            <div className="engineeringSteps">

              {steps.map((step, index) => (
                <article key={step.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>

                  <div>
                    <h3>{step.title}</h3>

                    <p>
                      {step.description}
                    </p>
                  </div>
                </article>
              ))}

            </div>

            <LocalizedLink to="/contact" className="engineeringLink">
              {t('engineering.discuss')}
              <Arrow />
            </LocalizedLink>

          </div>

          <div className="engineeringVisual">

            <div className="engineeringVisualTop">
              <span>{visualTop[0]}</span>
              <span>{visualTop[1]}</span>
            </div>

            {/* Technical drawing stays LTR: dimensions read left-to-right */}
            <div className="technicalDrawing" dir="ltr">

              <div className="drawingAxis drawingAxisHorizontal" />
              <div className="drawingAxis drawingAxisVertical" />

              <div className="drawingObject">

                <div className="drawingCap" />

                <div className="drawingBody">

                  <div className="drawingRing drawingRingOne" />
                  <div className="drawingRing drawingRingTwo" />
                  <div className="drawingRing drawingRingThree" />

                </div>

              </div>

              <div className="drawingDimension drawingDimensionLeft">
                <span>H</span>
                <div />
                <span>4200</span>
              </div>

              <div className="drawingDimension drawingDimensionBottom">
                <span>Ø</span>
                <div />
                <span>2400</span>
              </div>

              <span className="drawingNote drawingNoteOne">
                {t('engineering.noteMaterial')}
              </span>

              <span className="drawingNote drawingNoteTwo">
                {t('engineering.noteProject')}
              </span>

            </div>

            <div className="engineeringVisualBottom">

              <div>
                <span>{t('engineering.typeLabel')}</span>
                <strong>{t('engineering.typeValue')}</strong>
              </div>

              <div>
                <span>{t('engineering.processLabel')}</span>
                <strong>{t('engineering.processValue')}</strong>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
