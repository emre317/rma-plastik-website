import { Link } from 'react-router-dom';
import usePageTitle from '../../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Page not found');

  return (
    <main className="notFoundPage">

      <div className="container">

        <span className="eyebrow">
          ERROR / 404
        </span>

        <h1>
          Page
          <span>not found.</span>
        </h1>

        <Link to="/">
          Return Home ↗
        </Link>

      </div>

    </main>
  );
}