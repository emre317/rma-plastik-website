import { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  getQuoteById,
  updateQuoteStatus,
} from '../../services/adminApi';
import {
  clearAdminSession,
  getAdminToken,
  isAuthError,
  notifyQuotesChanged,
} from '../../services/adminAuth';

const languageLabels = {
  tr: 'Turkish',
  en: 'English',
  ar: 'Arabic',
};

const statusLabels = {
  new: 'New',
  reviewing: 'Reviewing',
  contacted: 'Contacted',
  quoted: 'Quoted',
  closed: 'Closed',
};
import usePageTitle from '../../hooks/usePageTitle';

const statuses = [
  'new',
  'reviewing',
  'contacted',
  'quoted',
  'closed',
];

export default function AdminQuoteDetail() {
  usePageTitle('Quote Request');

  const { id } = useParams();
  const navigate = useNavigate();

  const token = getAdminToken();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }

    async function loadQuote() {
      try {
        setLoading(true);
        setError('');

        const response = await getQuoteById(id, token);

        setQuote(response.data);

        // Opening a request marks it as read on the server
        notifyQuotesChanged();
      } catch (err) {
        if (isAuthError(err)) {
          clearAdminSession();
          navigate('/admin/login', { replace: true });
          return;
        }

        setError(
          err.message ||
          'Quote request could not be loaded.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadQuote();
  }, [id, navigate, token]);

  async function handleStatusChange(event) {
    const status = event.target.value;

    setSaving(true);
    setError('');

    try {
      const response = await updateQuoteStatus(
        id,
        status,
        token
      );

      setQuote(response.data);
    } catch (err) {
      if (isAuthError(err)) {
        clearAdminSession();
        navigate('/admin/login', { replace: true });
        return;
      }

      setError(
        err.message ||
        'Status could not be updated.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="adminContent">
        <div className="adminLoading">
          Loading request...
        </div>
      </section>
    );
  }

  if (error && !quote) {
    return (
      <section className="adminContent">

        <Link
          to="/admin/quotes"
          className="adminBack"
        >
          ← Back to Requests
        </Link>

        <div className="adminErrorState">
          <span className="adminLabel">
            ERROR
          </span>

          <h1>
            Request could not be loaded.
          </h1>

          <p>
            {error}
          </p>
        </div>

      </section>
    );
  }

  if (!quote) {
    return null;
  }

  return (
    <section className="adminContent">

      <Link
        to="/admin/quotes"
        className="adminBack"
      >
        ← Back to Requests
      </Link>

      <div className="adminQuoteDetailHeader">

        <div>

          <span className="adminLabel">
            QUOTE REQUEST
          </span>

          <h1>
            {quote.company}
          </h1>

          <p>
            {quote.name} ·{' '}
            <a href={`mailto:${quote.email}`}>
              {quote.email}
            </a>
          </p>

        </div>

        <div className="adminStatusControl">

          <span>
            Status
          </span>

          <select
            aria-label="Request status"
            value={quote.status}
            disabled={saving}
            onChange={handleStatusChange}
          >
            {statuses.map((status) => (
              <option
                key={status}
                value={status}
              >
                {statusLabels[status]}
              </option>
            ))}
          </select>

          {saving && (
            <small>
              Saving...
            </small>
          )}

        </div>

      </div>

      {error && (
        <div className="adminInlineError" role="alert">
          {error}
        </div>
      )}

      <div className="adminQuoteDetailGrid">

        <div className="adminQuoteInfo">

          <div>
            <span>Company</span>

            <strong>
              {quote.company}
            </strong>
          </div>

          <div>
            <span>Contact</span>

            <strong>
              {quote.name}
            </strong>
          </div>

          <div>
            <span>Email</span>

            <strong>
              <a href={`mailto:${quote.email}`}>
                {quote.email}
              </a>
            </strong>
          </div>

          <div>
            <span>Phone</span>

            <strong>
              {quote.phone ? (
                <a href={`tel:${quote.phone.replace(/[^\d+]/g, '')}`}>
                  {quote.phone}
                </a>
              ) : '-'}
            </strong>
          </div>

          <div>
            <span>Country</span>

            <strong>
              {quote.country || '-'}
            </strong>
          </div>

          <div>
            <span>Product</span>

            <strong>
              {quote.product || '-'}
            </strong>
          </div>

          <div>
            <span>Capacity</span>

            <strong>
              {quote.capacity || '-'}
            </strong>
          </div>

          <div>
            <span>Quantity</span>

            <strong>
              {quote.quantity || '-'}
            </strong>
          </div>

          <div>
            <span>Application</span>

            <strong>
              {quote.application || '-'}
            </strong>
          </div>

          <div>
            <span>Language</span>

            <strong>
              {languageLabels[quote.language] || '-'}
            </strong>
          </div>

          <div>
            <span>Source</span>

            <strong>
              {quote.source || 'website'}
            </strong>
          </div>

          <div>
            <span>Created</span>

            <strong>
              {quote.createdAt
                ? new Date(
                    quote.createdAt
                  ).toLocaleString()
                : '-'}
            </strong>
          </div>

          <div>
            <span>Updated</span>

            <strong>
              {quote.updatedAt
                ? new Date(
                    quote.updatedAt
                  ).toLocaleString()
                : '-'}
            </strong>
          </div>

        </div>

        <div className="adminQuoteMessage">

          <span>
            PROJECT DETAILS
          </span>

          <p>
            {quote.message}
          </p>

        </div>

      </div>

    </section>
  );
}