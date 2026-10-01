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

const statuses = [
  'new',
  'reviewing',
  'contacted',
  'quoted',
  'closed',
];

export default function AdminQuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem('rma_admin_token');

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
      } catch (err) {
        console.error(err);

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
      console.error(err);

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
            {quote.name} · {quote.email}
          </p>

        </div>

        <div className="adminStatusControl">

          <span>
            Status
          </span>

          <select
            value={quote.status}
            disabled={saving}
            onChange={handleStatusChange}
          >
            {statuses.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
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
        <div className="adminInlineError">
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
              {quote.email}
            </strong>
          </div>

          <div>
            <span>Phone</span>

            <strong>
              {quote.phone || '-'}
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