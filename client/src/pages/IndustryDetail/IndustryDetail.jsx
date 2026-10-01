import { useParams } from 'react-router-dom';
import usePageTitle from '../../hooks/usePageTitle';
import formatSlug from '../../utils/formatSlug';

export default function IndustryDetail() {
  const { slug } = useParams();

  usePageTitle(formatSlug(slug));

  return (
    <main className="internalPage">

      <section className="internalHero">
        <div className="container">

          <div className="internalHeroMeta">
            <span>
              INDUSTRY
            </span>

            <span>
              {slug}
            </span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              INDUSTRY SOLUTION
            </p>

            <h1>
              Application-focused
              <span>solutions.</span>
            </h1>

          </div>

        </div>
      </section>

    </main>
  );
}