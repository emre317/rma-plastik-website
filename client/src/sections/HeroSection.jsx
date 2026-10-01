export default function HeroSection() {
  return (
    <section className="hero" id="home">
      <div className="container heroContainer">

        <div className="heroTop">
          <span className="heroIndex">01 / RMA PLASTIK</span>

          <span className="heroSince">
            MANUFACTURING SINCE 1998
          </span>
        </div>

        <div className="heroGrid">

          <div className="heroContent">

            <p className="eyebrow">
              ENGINEERED FOR INDUSTRY
            </p>

            <h1>
              Polyethylene
              <span>Solutions.</span>
              Built to Perform.
            </h1>

            <p className="lead">
              Advanced polyethylene manufacturing solutions engineered
              for demanding industrial applications.
            </p>

            <div className="actions">

              <a
                className="button primary"
                href="#products"
              >
                <span>Explore Products</span>
                <span className="buttonArrow">↗</span>
              </a>

              <a
                className="button ghost"
                href="#contact"
              >
                <span>Request a Solution</span>
                <span className="buttonArrow">↗</span>
              </a>

            </div>

          </div>

          <div className="heroVisual">

            <div className="heroVisualTop">

              <span>
                INDUSTRIAL
              </span>

              <span>
                POLYETHYLENE
              </span>

            </div>

            <div className="tankVisual">

              <div className="tankTop" />

              <div className="tankBody">

                <div className="tankLine tankLineOne" />
                <div className="tankLine tankLineTwo" />
                <div className="tankLine tankLineThree" />

              </div>

            </div>

            <div className="heroVisualBottom">

              <div>
                <span className="visualLabel">
                  PRODUCTION RANGE
                </span>

                <strong>
                  10 — 42,000 L
                </strong>
              </div>

              <span className="visualNumber">
                RMA / 01
              </span>

            </div>

          </div>

        </div>

        <div className="heroBottom">

          <span>
            MERSIN / ISTANBUL
          </span>

          <span>
            SCROLL TO EXPLORE
          </span>

        </div>

      </div>
    </section>
  );
}