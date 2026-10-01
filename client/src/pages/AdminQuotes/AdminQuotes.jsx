import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { getQuotes } from '../../services/adminApi';

const allowedStatuses = [
  'all',
  'new',
  'reviewing',
  'contacted',
  'quoted',
  'closed',
];

export default function AdminQuotes() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] =
    useSearchParams();

  const token = localStorage.getItem(
    'rma_admin_token'
  );

  const initialStatus =
    searchParams.get('status') || 'all';

  const initialPage =
    Number(
      searchParams.get('page')
    ) || 1;

  const [quotes, setQuotes] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState(
      allowedStatuses.includes(initialStatus)
        ? initialStatus
        : 'all'
    );

  const [page, setPage] =
    useState(initialPage);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 10,
      total: 0,
      pages: 1,
    });

  useEffect(() => {
    if (!token) {
      navigate(
        '/admin/login',
        {
          replace: true,
        }
      );

      return;
    }

    async function loadQuotes() {
      try {
        setLoading(true);
        setError('');

        const response =
          await getQuotes(
            token,
            {
              page,
              limit: 10,
              status:
                statusFilter,
            }
          );

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
            limit: 10,
            total: 0,
            pages: 1,
          }
        );
      } catch (err) {
        console.error(err);

        localStorage.removeItem(
          'rma_admin_token'
        );

        localStorage.removeItem(
          'rma_admin_user'
        );

        navigate(
          '/admin/login',
          {
            replace: true,
          }
        );
      } finally {
        setLoading(false);
      }
    }

    loadQuotes();
  }, [
    navigate,
    token,
    page,
    statusFilter,
  ]);

  useEffect(() => {
    const params = {};

    if (
      statusFilter !== 'all'
    ) {
      params.status =
        statusFilter;
    }

    if (page > 1) {
      params.page =
        String(page);
    }

    setSearchParams(params);
  }, [
    page,
    statusFilter,
    setSearchParams,
  ]);

  const filteredQuotes =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      if (!normalizedSearch) {
        return quotes;
      }

      return quotes.filter(
        (quote) => {
          const values = [
            quote.company,
            quote.name,
            quote.email,
            quote.product,
            quote.country,
          ];

          return values.some(
            (value) =>
              String(
                value || ''
              )
                .toLowerCase()
                .includes(
                  normalizedSearch
                )
          );
        }
      );
    }, [
      quotes,
      search,
    ]);

  function handleStatusChange(
    event
  ) {
    setStatusFilter(
      event.target.value
    );

    setPage(1);
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

    setPage(nextPage);
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setPage(1);
  }

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
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search current page..."
        />

        <select
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


      {statusFilter !== 'all' && (
        <div className="adminActiveFilter">

          <span>
            Active filter:
          </span>

          <strong>
            {statusFilter}
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


      {!loading &&
        !error &&
        filteredQuotes.length >
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

              {filteredQuotes.map(
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
                      {quote.status}
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
          </>
        )}


      {!loading &&
        !error &&
        filteredQuotes.length ===
          0 && (
          <div className="adminEmptyState">

            <span className="adminLabel">
              NO RESULTS
            </span>

            <h2>
              No quote requests found.
            </h2>

            <button
              type="button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>

          </div>
        )}

    </section>
  );
}