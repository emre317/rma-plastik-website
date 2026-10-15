import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, History, LogIn, Search, Settings, ShieldAlert, ShoppingBag, Type, UserRound, Users,
} from 'lucide-react';

import { listAudit } from '../../services/adminApi';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import Dropdown from '../../components/ui/Dropdown';
import { roleLabel } from '../../components/admin/roles';

const AREAS = [
  { id: '', label: 'Tümü' },
  { id: 'sales', label: 'Satış', icon: ShoppingBag },
  { id: 'content', label: 'İçerik', icon: Type },
  { id: 'users', label: 'Kullanıcılar', icon: Users },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
  { id: 'auth', label: 'Giriş', icon: LogIn },
];

const areaIcon = (id) => AREAS.find((area) => area.id === id)?.icon || History;

// Where an entry leads in the panel (deleted records have no page)
function targetLink(entry) {
  if (!entry.targetId || /sildi$/.test(entry.action)) return null;
  const links = {
    quote: `/admin/quotes/${entry.targetId}`,
    family: `/admin/product-families/${entry.targetId}`,
    sector: `/admin/sectors/${entry.targetId}`,
    post: `/admin/posts/${entry.targetId}`,
  };
  return links[entry.targetType] || null;
}

const dayKey = (value) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full', timeZone: 'Europe/Istanbul' }).format(new Date(value));
const timeOf = (value) => new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }).format(new Date(value));

const PAGE_SIZE = 50;

/* Activity log: who did what in the panel, newest first (admin only) */
export default function AdminAudit() {
  usePageTitle('İşlem Geçmişi');

  const call = useAdminApi();

  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ user: '', area: '', from: '', to: '' });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const response = await call(listAudit, { page, limit: PAGE_SIZE, ...filters, search });
        if (cancelled) return;
        setEntries(Array.isArray(response.data) ? response.data : []);
        setUsers(Array.isArray(response.users) ? response.users : []);
        setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [call, page, filters, search]);

  const setFilter = (changes) => {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(1);
  };

  // Entries grouped by day
  const days = useMemo(() => {
    const groups = [];
    entries.forEach((entry) => {
      const key = dayKey(entry.at);
      const last = groups[groups.length - 1];
      if (last?.key === key) last.items.push(entry);
      else groups.push({ key, items: [entry] });
    });
    return groups;
  }, [entries]);

  const filtered = Boolean(search || filters.user || filters.area || filters.from || filters.to);

  return (
    <section className="adminContent adAudit">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Ayarlar</span>
          <h1>İşlem Geçmişi</h1>
          <p>Panelde kimin, neyi, ne zaman yaptığı: talep ve proforma işlemleri, içerik değişiklikleri, kullanıcı işlemleri ve girişler. Kayıtlar iki yıl saklanır.</p>
        </div>
      </header>

      <div className="adReportFilters">
        <div className="adSegment" role="group" aria-label="Bölüm">
          {AREAS.map((area) => (
            <button key={area.id || 'all'} type="button" className={filters.area === area.id ? 'active' : ''} aria-pressed={filters.area === area.id} onClick={() => setFilter({ area: area.id })}>
              {area.label}
            </button>
          ))}
        </div>
        <div className="adDateRange">
          <input type="date" value={filters.from} max={filters.to || undefined} aria-label="Başlangıç tarihi" onChange={(event) => setFilter({ from: event.target.value })} />
          <span aria-hidden="true">–</span>
          <input type="date" value={filters.to} min={filters.from || undefined} aria-label="Bitiş tarihi" onChange={(event) => setFilter({ to: event.target.value })} />
        </div>
      </div>

      <div className="adToolbar">
        <label className="adSearch">
          <Search aria-hidden="true" />
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="İşlem, kayıt adı veya kişi ara…" aria-label="İşlem geçmişinde ara" />
        </label>
        <Dropdown
          className="adDd"
          icon={UserRound}
          value={filters.user}
          onChange={(user) => setFilter({ user })}
          label="Kişiye göre filtrele"
          options={[{ value: '', label: 'Tüm Kişiler' }, ...users.map((user) => ({ value: user.id, label: user.name || user.email, hint: user.email }))]}
          align="end"
        />
        <span className="adToolbarCount">{pagination.total} kayıt</span>
      </div>

      {loading && <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>}
      {!loading && error && <div className="adminInlineError" role="alert">{error}</div>}

      {!loading && !error && entries.length === 0 && (
        <div className="adState">
          <span className="adStateIcon" aria-hidden="true"><History /></span>
          <h2>{filtered ? 'Bu filtrelere uyan kayıt yok' : 'Henüz kayıt yok'}</h2>
          <p>Paneldeki işlemler (kaydetme, silme, gönderme, giriş) yapıldıkça burada listelenir.</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="adCard adAuditList">
          {days.map((group) => (
            <Fragment key={group.key}>
              <h2 className="adAuditDay">{group.key}</h2>
              <ol>
                {group.items.map((entry) => {
                  const Icon = entry.action === 'Başarısız giriş denemesi' ? ShieldAlert : areaIcon(entry.area);
                  const link = targetLink(entry);
                  return (
                    <li key={entry._id} className={entry.action === 'Başarısız giriş denemesi' ? 'warn' : ''}>
                      <time dateTime={entry.at}>{timeOf(entry.at)}</time>
                      <span className="adAuditIcon" aria-hidden="true"><Icon /></span>
                      <span className="adAuditText">
                        <span>
                          <strong>{entry.user?.name || entry.user?.email || 'Bilinmeyen'}</strong>
                          {entry.user?.role && <em>{roleLabel(entry.user.role)}</em>}
                          {' '}{entry.action.charAt(0).toLocaleLowerCase('tr') + entry.action.slice(1)}
                          {entry.targetLabel && (
                            <>
                              {': '}
                              {link ? <Link to={link}>{entry.targetLabel}</Link> : <b>{entry.targetLabel}</b>}
                            </>
                          )}
                        </span>
                        {(entry.details || (!entry.user?.name && entry.user?.email)) && (
                          <small>{[!entry.user?.name && entry.user?.email ? entry.user.email : '', entry.details].filter(Boolean).join(' · ')}</small>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Fragment>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <nav className="adPager" aria-label="Sayfalar">
          <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Önceki sayfa"><ChevronLeft aria-hidden="true" /></button>
          <span>Sayfa {pagination.page} / {pagination.pages}</span>
          <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pagination.pages} aria-label="Sonraki sayfa"><ChevronRight aria-hidden="true" /></button>
        </nav>
      )}
    </section>
  );
}
