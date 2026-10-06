import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Inbox, Package, RotateCcw, Search } from 'lucide-react';

import { getQuoteStats, getQuotes } from '../../services/adminApi';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { QUOTE_STATUSES, formatDate, statusLabel, statusTone, timeAgo } from '../../components/admin/quoteStatus';

const PAGE_SIZE = 12;
const ALLOWED = ['all', ...QUOTE_STATUSES.map((status) => status.id)];

/* Quote requests: status tabs with counts, search, paged list */
export default function AdminQuotes() {
  usePageTitle('Teklif talepleri');

  const call = useAdminApi();
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL is the single source of truth for filters and paging
  const statusFilter = ALLOWED.includes(searchParams.get('status')) ? searchParams.get('status') : 'all';
  const page = Math.max(Number.parseInt(searchParams.get('page'), 10) || 1, 1);
  const search = searchParams.get('q') || '';

  const [searchInput, setSearchInput] = useState(search);
  const [quotes, setQuotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });

  function updateParams(changes) {
    const next = { status: statusFilter, page, q: search, ...changes };
    const params = {};

    if (next.status && next.status !== 'all') params.status = next.status;
    if (next.page > 1) params.page = String(next.page);
    if (next.q?.trim()) params.q = next.q.trim();

    setSearchParams(params, { replace: true });
  }

  // Keep the input in sync when the URL changes from outside (e.g. dashboard link)
  useEffect(() => setSearchInput(search), [search]);

  // Debounce typing before hitting the API
  useEffect(() => {
    if (searchInput.trim() === search) return undefined;
    const timeout = setTimeout(() => updateParams({ q: searchInput, page: 1 }), 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');

        const [response, statsResponse] = await Promise.all([
          call((token) => getQuotes(token, { page, limit: PAGE_SIZE, status: statusFilter, search })),
          call(getQuoteStats).catch(() => null),
        ]);

        if (cancelled) return;
        setQuotes(Array.isArray(response.data) ? response.data : []);
        setPagination(response.pagination || { page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
        if (statsResponse) setStats(statsResponse.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [call, page, statusFilter, search, reloadKey]);

  // A page number past the end (e.g. after filtering) falls back to the last page
  useEffect(() => {
    if (!loading && page > pagination.pages) updateParams({ page: pagination.pages });
  }, [loading, page, pagination.pages]);

  const hasFilters = statusFilter !== 'all' || Boolean(search);
  const clearFilters = () => {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  const tabs = [{ id: 'all', label: 'Tümü', count: stats?.total }, ...QUOTE_STATUSES.map((status) => ({ ...status, count: stats?.[status.id] }))];

  return (
    <section className="adminContent adQuotes">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Satış</span>
          <h1>Teklif talepleri</h1>
          <p>Siteden gelen tüm teklif talepleri. Bir talebi açtığınızda okundu olarak işaretlenir; durumunu değiştirerek süreci takip edin.</p>
        </div>
        {stats && (
          <div className="adHeadStat">
            <strong>{stats.unread}</strong>
            <span>okunmamış</span>
          </div>
        )}
      </header>

      <div className="adTabs" role="tablist" aria-label="Duruma göre filtrele">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={statusFilter === tab.id}
            className={statusFilter === tab.id ? 'active' : ''}
            onClick={() => updateParams({ status: tab.id, page: 1 })}
          >
            {tab.tone && <span className={`adStatusDot tone-${tab.tone}`} aria-hidden="true" />}
            {tab.label}
            {typeof tab.count === 'number' && <em>{tab.count}</em>}
          </button>
        ))}
      </div>

      <div className="adToolbar">
        <label className="adSearch">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Firma, kişi, e-posta veya ürün ara…"
            aria-label="Teklif taleplerinde ara"
          />
        </label>
        <span className="adToolbarCount">{pagination.total} talep</span>
        {hasFilters && (
          <button type="button" className="cmsButton" onClick={clearFilters}>
            <RotateCcw aria-hidden="true" />
            Filtreleri temizle
          </button>
        )}
      </div>

      {loading && <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2, 3].map((i) => <span key={i} />)}</div>}

      {!loading && error && (
        <div className="adState error">
          <h2>Talepler yüklenemedi</h2>
          <p>{error}</p>
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => setReloadKey((key) => key + 1)}>Tekrar dene</button>
        </div>
      )}

      {!loading && !error && quotes.length === 0 && (
        <div className="adState">
          <span className="adStateIcon" aria-hidden="true"><Inbox /></span>
          <h2>{hasFilters ? 'Bu filtrelere uyan talep yok' : 'Henüz teklif talebi yok'}</h2>
          <p>{hasFilters ? 'Aramayı veya durum filtresini değiştirin.' : 'Siteden gelen talepler burada listelenir; ayrıca e-posta ile bildirilir.'}</p>
          {hasFilters && <button type="button" className="cmsButton" onClick={clearFilters}>Filtreleri temizle</button>}
        </div>
      )}

      {!loading && !error && quotes.length > 0 && (
        <>
          <div className="adTable" role="table" aria-label="Teklif talepleri">
            <div className="adTableHead" role="row">
              <span role="columnheader">Firma / kişi</span>
              <span role="columnheader">Ürün</span>
              <span role="columnheader">Durum</span>
              <span role="columnheader">Tarih</span>
            </div>

            {quotes.map((quote) => (
              <Link key={quote._id} to={`/admin/quotes/${quote._id}`} className={`adTableRow ${!quote.isRead ? 'unread' : ''}`} role="row">
                <span className="adTableMain" role="cell">
                  <span className="adAvatarSm" aria-hidden="true">{(quote.company || '?').charAt(0).toLocaleUpperCase('tr')}</span>
                  <span>
                    <strong>
                      {!quote.isRead && <i className="adUnreadDot" aria-label="Okunmamış" />}
                      {quote.company}
                    </strong>
                    <small>{[quote.name, quote.country].filter(Boolean).join(' · ')}</small>
                  </span>
                </span>
                <span className="adTableProduct" role="cell">
                  {quote.items?.length > 0 && (
                    <span className="adItemCount"><Package aria-hidden="true" />{quote.items.length}</span>
                  )}
                  <span>{quote.product || 'Genel talep'}</span>
                </span>
                <span role="cell">
                  <span className={`adPill tone-${statusTone(quote.status)}`}>{statusLabel(quote.status)}</span>
                </span>
                <span className="adTableDate" role="cell" title={formatDate(quote.createdAt, true)}>
                  {timeAgo(quote.createdAt)}
                </span>
              </Link>
            ))}
          </div>

          {pagination.pages > 1 && (
            <nav className="adPager" aria-label="Sayfalar">
              <button type="button" onClick={() => updateParams({ page: page - 1 })} disabled={page <= 1} aria-label="Önceki sayfa">
                <ChevronLeft aria-hidden="true" />
              </button>
              <span>Sayfa {pagination.page} / {pagination.pages}</span>
              <button type="button" onClick={() => updateParams({ page: page + 1 })} disabled={page >= pagination.pages} aria-label="Sonraki sayfa">
                <ChevronRight aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
