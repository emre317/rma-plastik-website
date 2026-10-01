import { useParams } from 'react-router-dom';
import usePageTitle from '../../hooks/usePageTitle';
import formatSlug from '../../utils/formatSlug';

export default function TechnologyDetail() {
  const { slug } = useParams();

  usePageTitle(formatSlug(slug));

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