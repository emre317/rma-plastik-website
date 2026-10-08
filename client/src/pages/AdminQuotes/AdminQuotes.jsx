import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BarChart3, CalendarClock, ChevronLeft, ChevronRight, Download, Flag, Inbox, Megaphone, Package, RotateCcw, Search, UserRound, X,
} from 'lucide-react';

import { exportQuotes, getQuoteAssignees, getQuoteStats, getQuotes } from '../../services/adminApi';
import { exportQuotesFile } from './quoteExcel';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import {
  QUOTE_OUTCOMES, QUOTE_STATUSES, followUpState, formatDate, outcomeLabel, statusLabel, statusTone, timeAgo,
} from '../../components/admin/quoteStatus';
import Dropdown from '../../components/ui/Dropdown';

const PAGE_SIZE = 12;
const ALLOWED = ['all', 'due', ...QUOTE_STATUSES.map((status) => status.id)];

/* Quote requests: status tabs with counts, search, paged list */
export default function AdminQuotes() {
  usePageTitle('Teklif Talepleri');

  const call = useAdminApi();
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL is the single source of truth for filters and paging
  const statusFilter = ALLOWED.includes(searchParams.get('status')) ? searchParams.get('status') : 'all';
  const page = Math.max(Number.parseInt(searchParams.get('page'), 10) || 1, 1);
  const search = searchParams.get('q') || '';
  const assignee = searchParams.get('assignee') || '';
  const outcome = ['open', 'won', 'lost'].includes(searchParams.get('outcome')) ? searchParams.get('outcome') : '';
  const channel = searchParams.get('channel') || '';

  // "due" is a follow-up filter, the others are statuses
  const filters = {
    status: statusFilter === 'due' ? undefined : statusFilter,
    followUp: statusFilter === 'due' ? 'due' : undefined,
    search,
    assignee,
    outcome,
    channel,
  };

  const [searchInput, setSearchInput] = useState(search);
  const [quotes, setQuotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [assignees, setAssignees] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState('');

  function updateParams(changes) {
    const next = { status: statusFilter, page, q: search, assignee, outcome, channel, ...changes };
    const params = {};

    if (next.status && next.status !== 'all') params.status = next.status;
    if (next.page > 1) params.page = String(next.page);
    if (next.q?.trim()) params.q = next.q.trim();
    if (next.assignee) params.assignee = next.assignee;
    if (next.outcome) params.outcome = next.outcome;
    if (next.channel) params.channel = next.channel;

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
          call((token) => getQuotes(token, { page, limit: PAGE_SIZE, ...filters })),
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
  }, [call, page, statusFilter, search, assignee, outcome, channel, reloadKey]);

  useEffect(() => {
    call(getQuoteAssignees).then((response) => setAssignees(Array.isArray(response.data) ? response.data : [])).catch(() => {});
  }, [call]);

  async function download() {
    setExporting(true);
    setExportNote('');

    try {
      const response = await call(exportQuotes, filters);
      const count = await exportQuotesFile(response.data || []);
      setExportNote(response.truncated ? `İlk ${count} talep indirildi (en fazla 5000).` : `${count} talep Excel dosyasına aktarıldı.`);
    } catch (err) {
      setExportNote(err.message || 'Dışa aktarılamadı.');
    } finally {
      setExporting(false);
    }
  }

  // A page number past the end (e.g. after filtering) falls back to the last page
  useEffect(() => {
    if (!loading && page > pagination.pages) updateParams({ page: pagination.pages });
  }, [loading, page, pagination.pages]);

  const hasFilters = statusFilter !== 'all' || Boolean(search) || Boolean(assignee) || Boolean(outcome) || Boolean(channel);
  const clearFilters = () => {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  const tabs = [
    { id: 'all', label: 'Tümü', count: stats?.total },
    { id: 'due', label: 'Takibi Gelen', count: stats?.due, icon: CalendarClock },
    ...QUOTE_STATUSES.map((status) => ({ ...status, count: stats?.[status.id] })),
  ];

  return (
    <section className="adminContent adQuotes">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Satış</span>
          <h1>Teklif Talepleri</h1>
          <p>Siteden gelen tüm teklif talepleri. Bir talebi açtığınızda okundu olarak işaretlenir; durumunu değiştirerek süreci takip edin.</p>
        </div>
        <div className="adHeadActions">
          <Link to="/admin/quote-reports" className="cmsButton">
            <BarChart3 aria-hidden="true" />
            Satış Raporu
          </Link>
          {stats && (
            <div className="adHeadStat">
              <strong>{stats.unread}</strong>
              <span>okunmamış</span>
            </div>
          )}
        </div>
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
            {tab.icon && <tab.icon className="adTabIcon" aria-hidden="true" />}
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
        <Dropdown
          className="adDd"
          icon={UserRound}
          value={assignee}
          onChange={(value) => updateParams({ assignee: value, page: 1 })}
          label="Sorumlu kişiye göre filtrele"
          options={[
            { value: '', label: 'Tüm Sorumlular' },
            { value: '-', label: 'Atanmamış' },
            ...assignees.map((name) => ({ value: name, label: name })),
          ]}
        />
        <Dropdown
          className="adDd"
          icon={Flag}
          value={outcome}
          onChange={(value) => updateParams({ outcome: value, page: 1 })}
          label="Sonuca göre filtrele"
          options={[
            { value: '', label: 'Tüm Sonuçlar' },
            { value: 'open', label: 'Sonuçlanmamış' },
            ...QUOTE_OUTCOMES.map((item) => ({ value: item.id, label: item.label })),
          ]}
        />
        {channel && (
          <button type="button" className="adFilterChip" onClick={() => updateParams({ channel: '', page: 1 })} title="Kaynak filtresini kaldır">
            <Megaphone aria-hidden="true" />
            {channel}
            <X aria-hidden="true" />
          </button>
        )}
        <span className="adToolbarCount">{pagination.total} talep</span>
        <button type="button" className="cmsButton" onClick={download} disabled={exporting || !pagination.total} title="Görünen filtrelerle Excel dosyası indir">
          <Download aria-hidden="true" />
          {exporting ? 'Hazırlanıyor…' : 'Excel’e aktar'}
        </button>
        {hasFilters && (
          <button type="button" className="cmsButton" onClick={clearFilters}>
            <RotateCcw aria-hidden="true" />
            Filtreleri Temizle
          </button>
        )}
      </div>

      {exportNote && <p className="adExportNote" role="status">{exportNote}</p>}

      {loading && <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2, 3].map((i) => <span key={i} />)}</div>}

      {!loading && error && (
        <div className="adState error">
          <h2>Talepler Yüklenemedi</h2>
          <p>{error}</p>
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => setReloadKey((key) => key + 1)}>Tekrar Dene</button>
        </div>
      )}

      {!loading && !error && quotes.length === 0 && (
        <div className="adState">
          <span className="adStateIcon" aria-hidden="true"><Inbox /></span>
          <h2>{hasFilters ? 'Bu filtrelere uyan talep yok' : 'Henüz teklif talebi yok'}</h2>
          <p>{hasFilters ? 'Aramayı veya durum filtresini değiştirin.' : 'Siteden gelen talepler burada listelenir; ayrıca e-posta ile bildirilir.'}</p>
          {hasFilters && <button type="button" className="cmsButton" onClick={clearFilters}>Filtreleri Temizle</button>}
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
                    {(quote.assignee || followUpState(quote)) && (
                      <span className="adRowTrack">
                        {quote.assignee && <span><UserRound aria-hidden="true" />{quote.assignee}</span>}
                        {followUpState(quote) && (
                          <span className={`adFollow ${followUpState(quote)}`}>
                            <CalendarClock aria-hidden="true" />
                            {formatDate(quote.followUpAt)}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </span>
                <span className="adTableProduct" role="cell">
                  {quote.items?.length > 0 && (
                    <span className="adItemCount"><Package aria-hidden="true" />{quote.items.length}</span>
                  )}
                  <span>{quote.product || 'Genel Talep'}</span>
                </span>
                <span role="cell">
                  {quote.outcome ? (
                    <span className={`adPill tone-${quote.outcome === 'won' ? 'green' : 'red'}`}>{outcomeLabel(quote.outcome)}</span>
                  ) : (
                    <span className={`adPill tone-${statusTone(quote.status)}`}>{statusLabel(quote.status)}</span>
                  )}
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
