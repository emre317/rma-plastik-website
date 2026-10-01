import { useParams } from 'react-router-dom';

export default function TechnologyDetail() {
  const { slug } = useParams();

  return (
    <main className="internalPage">

      <section className="internalHero internalHeroDark">
        <div className="container">

          <div className="internalHeroMeta">
            <span>
              TECHNOLOGY
            </span>

            <span>
              {slug}
            </span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              MANUFACTURING PROCESS
            </p>

            <h1>
              Technology
              <span>in production.</span>
            </h1>

          </div>

        </div>
      </section>

    </main>
  );
}