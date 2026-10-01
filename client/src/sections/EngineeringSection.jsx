import { Link } from 'react-router-dom';

export default function EngineeringSection() {
  return (
    <section className="engineeringSection dark" id="engineering">
      <div className="container">

        <div className="engineeringHeader">

          <div>
            <span className="sectionIndex light">
              06 / ENGINEERING
            </span>

            <p className="eyebrow">
              CUSTOM MANUFACTURING
            </p>
          </div>

          <div>
            <h2>
              Not every solution
              <span>comes from a catalogue.</span>
            </h2>

            <p>
              RMA develops application-specific polyethylene products for
              projects that require custom geometry, capacity, production
              method or operational performance.
            </p>
          </div>

        </div>

        <div className="engineeringGrid">

          <div className="engineeringContent">

            <div className="engineeringIntro">
              <span className="engineeringSmallLabel">
                FROM IDEA TO PRODUCTION
              </span>

              <p>
                From initial requirement to industrial production, RMA supports
                product development through engineering, mold development and
                manufacturing expertise.
              </p>
            </div>

            <div className="engineeringSteps">

              <article>
                <span>01</span>

                <div>
                  <h3>Requirement Analysis</h3>

                  <p>
                    Understanding application, dimensions, capacity, working
                    conditions and project-specific requirements.
                  </p>
                </div>
              </article>

              <article>
                <span>02</span>

                <div>
                  <h3>Product Development</h3>

                  <p>
                    Translating the technical requirement into a manufacturable
                    polyethylene product concept.
                  </p>
                </div>
              </article>

              <article>
                <span>03</span>

                <div>
                  <h3>Mold Development</h3>

                  <p>
                    Preparing the manufacturing infrastructure required for
                    repeatable industrial production.
                  </p>
                </div>
              </article>

              <article>
                <span>04</span>

                <div>
                  <h3>Industrial Production</h3>

                  <p>
                    Moving the approved product into controlled and scalable
                    production.
                  </p>
                </div>
              </article>

            </div>

            <Link to="/contact" className="engineeringLink">
              Discuss Your Project
              <span>↗</span>
            </Link>

          </div>

          <div className="engineeringVisual">

            <div className="engineeringVisualTop">
              <span>TECHNICAL DEVELOPMENT</span>
              <span>RMA / ENGINEERING</span>
            </div>

            <div className="technicalDrawing">

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
                MATERIAL / PE
              </span>

              <span className="drawingNote drawingNoteTwo">
                PROJECT SPECIFIC
              </span>

            </div>

            <div className="engineeringVisualBottom">

              <div>
                <span>TYPE</span>
                <strong>Custom Product</strong>
              </div>

              <div>
                <span>PROCESS</span>
                <strong>Engineering + Production</strong>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}