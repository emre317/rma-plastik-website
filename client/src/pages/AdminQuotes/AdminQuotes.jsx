import { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { getQuotes } from '../../services/adminApi';
import {
  clearAdminSession,
  getAdminToken,
  isAuthError,
} from '../../services/adminAuth';
import usePageTitle from '../../hooks/usePageTitle';

const PAGE_SIZE = 10;

const statusLabels = {
  new: 'New',
  reviewing: 'Reviewing',
  contacted: 'Contacted',
  quoted: 'Quoted',
  closed: 'Closed',
};

const allowedStatuses = [
  'all',
  'new',
  'reviewing',
  'contacted',
  'quoted',
  'closed',
];

export default function AdminQuotes() {
  usePageTitle('Quote Requests');

  const navigate = useNavigate();

  const [searchParams, setSearchParams] =
    useSearchParams();

  const token = getAdminToken();

  // The URL is the single source of truth for filters and paging,
  // so dashboard links, sidebar links and back/forward all stay in sync.
  const requestedStatus =
    searchParams.get('status');

  const statusFilter =
    allowedStatuses.includes(requestedStatus)
      ? requestedStatus
      : 'all';

  const page = Math.max(
    Number.parseInt(searchParams.get('page'), 10) || 1,
    1
  );

  const search = searchParams.get('q') || '';

  const [searchInput, setSearchInput] =
    useState(search);

  const [quotes, setQuotes] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [reloadKey, setReloadKey] =
    useState(0);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      pages: 1,
    });

  function updateParams(changes) {
    const next = {
      status: statusFilter,
      page,
      q: search,
      ...changes,
    };

    const params = {};

    if (next.status && next.status !== 'all') {
      params.status = next.status;
    }

    if (next.page > 1) {
      params.page = String(next.page);
    }

    if (next.q?.trim()) {
      params.q = next.q.trim();
    }

    setSearchParams(params, { replace: true });
  }

  // Keep the input in sync when the URL changes from outside (e.g. sidebar link)
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Debounce typing before hitting the API
  useEffect(() => {
    if (searchInput.trim() === search) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      updateParams({
        q: searchInput,
        page: 1,
      });
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!token) {
      navigate(
        '/admin/login',
        {
          replace: true,
        }
      );

      return undefined;
    }

    let cancelled = false;

    async function loadQuotes() {
      try {
        setLoading(true);
        setError('');

        const response =
          await getQuotes(
            token,
            {
              page,
              limit: PAGE_SIZE,
              status:
                statusFilter,
              search,
            }
          );

        if (cancelled) {
          return;
        }

        setQuotes(
          Array.isArray(
            response.data
          )
            ? response.data
            : []
        );

        setPagination(
          response.pagination || {
            page: 1,
            limit: PAGE_SIZE,
            total: 0,
            pages: 1,
          }
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        if (isAuthError(err)) {
          clearAdminSession();

          navigate(
            '/admin/login',
            {
              replace: true,
            }
          );

          return;
        }

        setError(err.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQuotes();

    return () => {
      cancelled = true;
    };
  }, [
    navigate,
    token,
    page,
    statusFilter,
    search,
    reloadKey,
  ]);

  // A page number past the end (e.g. after filtering) falls back to the last page
  useEffect(() => {
    if (
      !loading &&
      page > pagination.pages
    ) {
      updateParams({ page: pagination.pages });
    }
  }, [loading, page, pagination.pages]);

  function handleStatusChange(
    event
  ) {
    updateParams({
      status: event.target.value,
      page: 1,
    });
  }

  function goToPage(
    nextPage
  ) {
    if (
      nextPage < 1 ||
      nextPage >
        pagination.pages
    ) {
      return;
    }

    updateParams({ page: nextPage });
  }

  function clearFilters() {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  }

  const hasFilters =
    statusFilter !== 'all' || Boolean(search);

  function formatDate(date) {
    if (!date) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    ).format(
      new Date(date)
    );
  }

  return (
    <section className="adminContent">

      <div className="adminPageHeader">

        <div>
          <span className="adminLabel">
            CUSTOMER REQUESTS
          </span>

          <h1>
            Quote Requests
          </h1>
        </div>

        <span>
          {pagination.total}
          {' '}
          Requests
        </span>

      </div>


      <div className="adminQuoteToolbar">

        <input
          type="search"
          value={searchInput}
          onChange={(event) =>
            setSearchInput(
              event.target.value
            )
          }
          placeholder="Search company, contact, email, product..."
          aria-label="Search quote requests"
        />

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={
            handleStatusChange
          }
        >
          <option value="all">
            All Statuses
          </option>

          <option value="new">
            New
          </option>

          <option value="reviewing">
            Reviewing
          </option>

          <option value="contacted">
            Contacted
          </option>

          <option value="quoted">
            Quoted
          </option>

          <option value="closed">
            Closed
          </option>
        </select>

      </div>


      {hasFilters && (
        <div className="adminActiveFilter">

          <span>
            Active filter:
          </span>

          <strong>
            {[
              statusFilter !== 'all'
                ? statusLabels[statusFilter]
                : null,
              search ? `“${search}”` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </strong>

          <button
            type="button"
            onClick={clearFilters}
          >
            Clear
          </button>

        </div>
      )}


      {loading && (
        <div className="adminLoading">
          Loading requests...
        </div>
      )}


      {!loading && error && (
        <div className="adminErrorState">

          <span className="adminLabel">
            ERROR
          </span>

          <h2>
            Requests could not be loaded.
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setReloadKey((key) => key + 1)
            }
          >
            Try Again
          </button>

        </div>
      )}


      {!loading &&
        !error &&
        quotes.length >
          0 && (
          <>
            <div className="adminQuoteTable">

              <div className="adminQuoteTableHead">
                <span>
                  Company / Contact
                </span>

                <span>
                  Product
                </span>

                <span>
                  Status
                </span>

                <span>
                  Date
                </span>

                <span />
              </div>

              {quotes.map(
                (quote) => (
                  <Link
                    key={quote._id}
                    to={`/admin/quotes/${quote._id}`}
                    className={`adminQuoteRow ${
                      !quote.isRead
                        ? 'unread'
                        : ''
                    }`}
                  >

                    <div>
                      <strong>
                        {quote.company}
                      </strong>

                      <span>
                        {quote.name}
                      </span>
                    </div>

                    <span>
                      {quote.product ||
                        'General Request'}
                    </span>

                    <span
                      className={`quoteStatus ${quote.status}`}
                    >
                      {statusLabels[quote.status] || quote.status}
                    </span>

                    <span>
                      {formatDate(
                        quote.createdAt
                      )}
                    </span>

                    <span>
                      ↗
                    </span>

                  </Link>
                )
              )}

            </div>


            {pagination.pages > 1 && (
            <div className="adminPagination">

              <button
                type="button"
                disabled={
                  pagination.page <= 1
                }
                onClick={() =>
                  goToPage(
                    pagination.page - 1
                  )
                }
              >
                ← Previous
              </button>

              <div>
                {Array.from(
                  {
                    length:
                      pagination.pages,
                  },
                  (_, index) =>
                    index + 1
                ).map(
                  (pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      className={
                        pageNumber ===
                        pagination.page
                          ? 'active'
                          : ''
                      }
                      onClick={() =>
                        goToPage(
                          pageNumber
                        )
                      }
                    >
                      {pageNumber}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                disabled={
                  pagination.page >=
                  pagination.pages
                }
                onClick={() =>
                  goToPage(
                    pagination.page + 1
                  )
                }
              >
                Next →
              </button>

            </div>
            )}
          </>
        )}


      {!loading &&
        !error &&
        quotes.length ===
          0 && (
          <div className="adminEmptyState">

            <span className="adminLabel">
              NO RESULTS
            </span>

            <h2>
              {hasFilters
                ? 'No quote requests match these filters.'
                : 'No quote requests yet.'}
            </h2>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}

          </div>
        )}

    </section>
  );
}