import { Link } from 'react-router-dom';

export default function NotFound() {
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