import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, CalendarDays, ChevronLeft, ChevronRight, Search, Users, Video } from 'lucide-react';

import { getMeetingSummary, getMeetings } from '../../services/adminApi';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { timeAgo } from '../../components/admin/quoteStatus';
import MeetingBlocks from './MeetingBlocks';
import {
  MEETING_TYPE, awaitsResult, outcomeLabel, outcomeTone, meetingStatusLabel, meetingStatusTone, meetingTime, meetingTopic,
} from '../../components/admin/meetingStatus';

const VIEWS = [
  { id: 'pending', label: 'Onay Bekleyen' },
  { id: 'upcoming', label: 'Yaklaşan' },
  { id: 'results', label: 'Sonuç Bekleyen' },
  { id: 'past', label: 'Geçmiş' },
  { id: 'cancelled', label: 'İptal' },
  { id: 'all', label: 'Tümü' },
];

const EMPTY = {
  pending: 'Onay bekleyen toplantı talebi yok.',
  upcoming: 'Onaylanmış yaklaşan toplantı yok.',
  results: 'Sonucu girilmemiş toplantı yok.',
  past: 'Geçmiş toplantı yok.',
  cancelled: 'İptal edilen toplantı yok.',
  all: 'Henüz toplantı talebi gelmedi.',
};

const dayParts = (value) => {
  const date = new Date(value);
  const format = (options) => new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', ...options }).format(date);
  return { weekday: format({ weekday: 'short' }), day: format({ day: 'numeric' }), month: format({ month: 'short' }) };
};

/* Toplantılar: website meeting requests and confirmed meetings */
export default function AdminMeetings() {
  usePageTitle('Toplantılar');
  const call = useAdminApi();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.some((item) => item.id === params.get('view')) ? params.get('view') : 'pending';

  const [type, setType] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [pending, setPending] = useState(0);
  const [awaiting, setAwaiting] = useState(0);
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
        const [response, summary] = await Promise.all([
          call(getMeetings, { view, type, search, page }),
          call(getMeetingSummary).catch(() => null),
        ]);
        if (cancelled) return;
        setData({ list: response.data || [], pagination: response.pagination || { page: 1, pages: 1, total: 0 } });
        setPending(summary?.data?.pending || 0);
        setAwaiting(summary?.data?.awaitingResult || 0);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call, view, type, search, page]);

  const setView = (id) => {
    setPage(1);
    setParams(id === 'pending' ? {} : { view: id });
  };

  return (
    <section className="adminContent adMeetings">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Satış</span>
          <h1>Toplantılar</h1>
          <p>Siteden gelen yüz yüze ve online (Teams) toplantı talepleri. Bir talebi açıp zamanı onaylayın ya da değiştirin, katılacak RMA çalışanlarını seçin; müşteriye ve çalışanlara davet e-postası gider.</p>
        </div>
      </header>

      <MeetingBlocks call={call} />

      <div className="mtTabs" role="tablist" aria-label="Toplantı görünümü">
        {VIEWS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={view === item.id} className={`adChip ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
            {item.label}
            {item.id === 'pending' && pending > 0 && <span className="mtTabCount">{pending}</span>}
            {item.id === 'results' && awaiting > 0 && <span className="mtTabCount amber">{awaiting}</span>}
          </button>
        ))}
      </div>

      <div className="adToolbar">
        <label className="adSearch">
          <Search aria-hidden="true" />
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Firma, kişi, e-posta veya konu ara…" aria-label="Toplantılarda ara" />
        </label>
        <div className="mtTabs" style={{ margin: 0 }}>
          {[{ id: '', label: 'Tüm türler' }, { id: 'inPerson', label: 'Yüz yüze' }, { id: 'online', label: 'Online' }].map((item) => (
            <button key={item.id || 'all'} type="button" className={`adChip ${type === item.id ? 'active' : ''}`} onClick={() => { setType(item.id); setPage(1); }}>{item.label}</button>
          ))}
        </div>
        <span className="adToolbarCount">{data.pagination.total} kayıt</span>
      </div>

      {error && <div className="adminInlineError" role="alert">{error}</div>}

      {loading && <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>}

      {!loading && !error && data.list.length === 0 && (
        <div className="adState">
          <span className="adStateIcon" aria-hidden="true"><CalendarDays /></span>
          <h2>{search || type ? 'Bu filtreye uyan toplantı yok' : EMPTY[view]}</h2>
          <p>Ziyaretçiler sitedeki “Toplantı Talep Edin” baloncuğundan yüz yüze ya da online toplantı istediğinde burada listelenir ve info@rmaplastik.com adresine e-posta gelir.</p>
        </div>
      )}

      {!loading && data.list.length > 0 && (
        <div className="mtList">
          {data.list.map((meeting) => {
            const when = meeting.startAt;
            const parts = dayParts(when);
            const online = meeting.type === 'online';
            const moved = meeting.status === 'pending' ? false : new Date(meeting.requestedStartAt).getTime() !== new Date(meeting.startAt).getTime();

            return (
              <Link key={meeting._id} to={`/admin/meetings/${meeting._id}`} className={`mtRow ${!meeting.isRead ? 'unread' : ''}`}>
                <span className="mtDate" aria-hidden="true">
                  <small>{parts.weekday}</small>
                  <strong>{parts.day}</strong>
                  <span>{parts.month} · {meetingTime(when)}</span>
                </span>

                <span className="mtRowMain">
                  <strong>{meeting.company}</strong>
                  <small>{[meeting.name, meeting.country].filter(Boolean).join(' · ')}</small>
                  <small>{meetingTopic(meeting)}</small>
                </span>

                <span className="mtRowMeta">
                  <span className={`mtKind ${online ? 'online' : ''}`}>
                    {online ? <Video aria-hidden="true" /> : <Building2 aria-hidden="true" />}
                    {MEETING_TYPE[meeting.type]}
                  </span>
                  {(meeting.staff || []).length > 0 && (
                    <small><Users aria-hidden="true" style={{ width: 13, height: 13, verticalAlign: '-2px' }} /> {meeting.staff.map((person) => person.name).join(', ')}</small>
                  )}
                  {online && (meeting.guests || []).length > 0 && <small>+{meeting.guests.length} müşteri katılımcısı</small>}
                  {meeting.status === 'pending' && <small>Talep: {timeAgo(meeting.createdAt)}</small>}
                  {moved && <small>Zaman revize edildi</small>}
                </span>

                <span className="mtRowPills">
                  <span className={`adPill tone-${meetingStatusTone(meeting)}`}>{meetingStatusLabel(meeting)}</span>
                  {meeting.quoteId ? (
                    <span className="adPill tone-green">Teklife dönüştü</span>
                  ) : meeting.result?.outcome ? (
                    <span className={`adPill tone-${outcomeTone(meeting.result.outcome)}`}>{outcomeLabel(meeting.result.outcome)}</span>
                  ) : awaitsResult(meeting) ? (
                    <span className="adPill tone-amber">Sonuç girilmedi</span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {data.pagination.pages > 1 && (
        <nav className="adPager" aria-label="Sayfalar">
          <button type="button" className="adIconButton" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} aria-label="Önceki sayfa"><ChevronLeft aria-hidden="true" /></button>
          <span>{page} / {data.pagination.pages}</span>
          <button type="button" className="adIconButton" onClick={() => setPage((value) => Math.min(data.pagination.pages, value + 1))} disabled={page >= data.pagination.pages} aria-label="Sonraki sayfa"><ChevronRight aria-hidden="true" /></button>
        </nav>
      )}
    </section>
  );
}
