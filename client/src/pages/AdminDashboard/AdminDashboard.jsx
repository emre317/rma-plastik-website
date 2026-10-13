import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, BarChart3, BellRing, CalendarClock, CheckCircle2, Clock3, FilePlus2, FileSpreadsheet, FileText, Inbox,
  PlayCircle, Rocket, Save, Table2, Upload,
} from 'lucide-react';

import { getQuoteStats, getQuotes } from '../../services/adminApi';
import { listFamilies, listPosts, listVideos } from '../../services/adminContentApi';
import useAdminApi from '../../hooks/useAdminApi';
import { useAdminSession } from '../../components/admin/AdminSession';
import usePageTitle from '../../hooks/usePageTitle';
import builtInFamilies from '../../data/productTables.builtin';
import { QUOTE_STATUSES, statusLabel, statusTone, timeAgo } from '../../components/admin/quoteStatus';

const today = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

/* Admin home: request pipeline, latest requests, content overview, quick actions */
export default function AdminDashboard() {
  usePageTitle('Özet');

  const call = useAdminApi();
  const { can } = useAdminSession();
  const sales = can('sales');
  const editor = can('content');

  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Quote figures only for roles that work with requests
      setError('');
      if (!sales) {
        setStats(null);
        setRecent([]);
      }

      if (sales) {
        try {
          const [statsResponse, quotesResponse] = await Promise.all([
            call(getQuoteStats),
            call((token) => getQuotes(token, { page: 1, limit: 6 })),
          ]);

          if (cancelled) return;
          setStats(statsResponse.data);
          setRecent(Array.isArray(quotesResponse.data) ? quotesResponse.data : []);
        } catch (err) {
          if (!cancelled) setError(err.message);
        }
      }

      // Content counts are a bonus: a failure here does not hide the requests
      const [families, posts, videos] = await Promise.allSettled([call(listFamilies), call(listPosts), call(listVideos)]);
      if (cancelled) return;

      const familyList = families.status === 'fulfilled' && families.value.data?.length ? families.value.data : null;
      const postList = posts.status === 'fulfilled' ? posts.value.data || [] : [];

      setContent({
        families: (familyList || builtInFamilies).length,
        models: (familyList || builtInFamilies).reduce((sum, family) => sum + (family.rows?.length || 0), 0),
        builtIn: !familyList,
        posts: postList.length,
        published: postList.filter((post) => post.status === 'published').length,
        videos: videos.status === 'fulfilled' ? (videos.value.data || []).length : 0,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [call, sales]);

  const open = (stats?.new || 0) + (stats?.reviewing || 0);
  const pipelineTotal = QUOTE_STATUSES.reduce((sum, status) => sum + (stats?.[status.id] || 0), 0);

  const kpis = [
    { label: 'Takibi Gelen', value: stats?.due ?? '–', icon: CalendarClock, to: '/admin/quotes?status=due', hint: 'Takip tarihi bugün veya geçmiş', accent: (stats?.due || 0) > 0 },
    { label: 'Okunmamış', value: stats?.unread ?? '–', icon: BellRing, to: '/admin/quotes', hint: 'Henüz açılmamış', accent: (stats?.unread || 0) > 0 },
    { label: 'Bekleyen', value: stats ? open : '–', icon: Clock3, to: '/admin/quotes?status=new', hint: 'Yeni + inceleniyor' },
    { label: 'Teklif Verilen', value: stats?.quoted ?? '–', icon: CheckCircle2, to: '/admin/quotes?status=quoted', hint: 'Teklifi gönderilmiş' },
  ];

  return (
    <section className="adminContent adDashboard">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">{today}</span>
          <h1>Hoş Geldiniz</h1>
          <p>
            {sales && editor && <>Teklif taleplerini takip edin, katalog ve içerikleri güncelleyin; değişiklikleri sol menüdeki <strong>Yayınla</strong> ile siteye aktarın.</>}
            {sales && !editor && 'Teklif taleplerini takip edin, proforma hazırlayın ve satış raporunu izleyin.'}
            {!sales && editor && <>Katalog ve içerikleri güncelleyin; değişiklikleri sol menüdeki <strong>Yayınla</strong> ile siteye aktarın.</>}
          </p>
        </div>
        {sales && (
        <div className="adHeadActions">
          <Link to="/admin/quote-reports" className="cmsButton">
            <BarChart3 aria-hidden="true" />
            Satış Raporu
          </Link>
          <Link to="/admin/quotes" className="cmsButton cmsButtonPrimary">
            <Inbox aria-hidden="true" />
            Talepleri Aç
          </Link>
        </div>
        )}
      </header>

      {error && <div className="adminInlineError">{error}</div>}

      {sales && (
      <>
      <div className="adKpis">
        {kpis.map((kpi) => (
          <Link key={kpi.label} to={kpi.to} className={`adKpi ${kpi.accent ? 'accent' : ''}`}>
            <span className="adKpiIcon" aria-hidden="true"><kpi.icon /></span>
            <span className="adKpiLabel">{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <small>{kpi.hint}</small>
          </Link>
        ))}
      </div>

      <div className="adGrid">
        {/* Pipeline */}
        <div className="adCard adPipeline">
          <div className="adCardHead">
            <h2>Talep Süreci</h2>
            <Link to="/admin/quotes">Tümü <ArrowUpRight aria-hidden="true" /></Link>
          </div>

          <div className="adBar" role="img" aria-label="Taleplerin duruma göre dağılımı">
            {QUOTE_STATUSES.map((status) => {
              const count = stats?.[status.id] || 0;
              return count > 0 ? (
                <span key={status.id} className={`tone-${status.tone}`} style={{ flexGrow: count }} title={`${status.label}: ${count}`} />
              ) : null;
            })}
            {pipelineTotal === 0 && <span className="tone-empty" style={{ flexGrow: 1 }} />}
          </div>

          <ul className="adStatusList">
            {QUOTE_STATUSES.map((status, index) => (
              <li key={status.id}>
                <Link to={`/admin/quotes?status=${status.id}`}>
                  <span className={`adStatusDot tone-${status.tone}`} aria-hidden="true" />
                  <span className="adStatusText">
                    <strong>{String(index + 1).padStart(2, '0')} · {status.label}</strong>
                    <small>{status.hint}</small>
                  </span>
                  <em>{stats?.[status.id] ?? '–'}</em>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Latest requests */}
        <div className="adCard adRecent">
          <div className="adCardHead">
            <h2>Son Talepler</h2>
            <Link to="/admin/quotes">Tüm Talepler <ArrowUpRight aria-hidden="true" /></Link>
          </div>

          {recent.length === 0 ? (
            <p className="adEmpty">Henüz teklif talebi yok. Siteden gelen talepler burada listelenir.</p>
          ) : (
            <ul className="adRecentList">
              {recent.map((quote) => (
                <li key={quote._id}>
                  <Link to={`/admin/quotes/${quote._id}`} className={!quote.isRead ? 'unread' : ''}>
                    <span className="adAvatarSm" aria-hidden="true">{(quote.company || '?').charAt(0).toLocaleUpperCase('tr')}</span>
                    <span className="adRecentText">
                      <strong>{quote.company}</strong>
                      <small>{quote.product || 'Genel Talep'}</small>
                    </span>
                    <span className={`adPill tone-${statusTone(quote.status)}`}>{statusLabel(quote.status)}</span>
                    <time dateTime={quote.createdAt}>{timeAgo(quote.createdAt)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      </>
      )}

      {/* Content */}
      <h2 className="adSectionTitle">İçerik ve katalog</h2>
      <div className="adContentCards">
        <Link to="/admin/product-families" className="adContentCard">
          <span className="adKpiIcon" aria-hidden="true"><Table2 /></span>
          <strong>{content ? `${content.families} aile · ${content.models} model` : '…'}</strong>
          <span>Ürün Tabloları</span>
          <small>{content?.builtIn ? 'Sitede broşür tabloları gösteriliyor; düzenlemek için içe aktarın.' : 'Ürün Tabloları ve Su Depoları sayfaları buradan beslenir.'}</small>
        </Link>
        <Link to="/admin/posts" className="adContentCard">
          <span className="adKpiIcon" aria-hidden="true"><FileText /></span>
          <strong>{content ? `${content.published} yayında · ${content.posts - content.published} taslak` : '…'}</strong>
          <span>Blog Yazıları</span>
          <small>Türkçe, İngilizce ve Arapça yazılar; SEO önizlemesiyle.</small>
        </Link>
        <Link to="/admin/videos" className="adContentCard">
          <span className="adKpiIcon" aria-hidden="true"><PlayCircle /></span>
          <strong>{content ? `${content.videos} video` : '…'}</strong>
          <span>Videolar</span>
          <small>İlk video ana sayfanın tanıtım filminde oynar.</small>
        </Link>
      </div>

      {editor && (
      <div className="adGrid">
        {/* Quick actions */}
        <div className="adCard">
          <div className="adCardHead"><h2>Hızlı İşlemler</h2></div>
          <div className="adActions">
            <Link to="/admin/posts/new"><FilePlus2 aria-hidden="true" />Yeni blog yazısı</Link>
            <Link to="/admin/product-families/new"><Table2 aria-hidden="true" />Yeni ürün ailesi</Link>
            <Link to="/admin/product-families"><FileSpreadsheet aria-hidden="true" />Excel ile toplu güncelle</Link>
            <Link to="/admin/videos"><PlayCircle aria-hidden="true" />Video Ekle</Link>
          </div>
        </div>

        {/* How publishing works */}
        <div className="adCard adHowTo">
          <div className="adCardHead"><h2>Değişiklikler siteye nasıl yansır?</h2></div>
          <ol>
            <li><span><Save aria-hidden="true" /></span><div><strong>Kaydedin</strong><small>Düzenlediğiniz sayfada Kaydet’e basın.</small></div></li>
            <li><span><Upload aria-hidden="true" /></span><div><strong>Yayınlayın</strong><small>Sol menüdeki Yayınla butonuna basın.</small></div></li>
            <li><span><Rocket aria-hidden="true" /></span><div><strong>Site güncellenir</strong><small>Birkaç dakika içinde tüm dillerde yayında olur.</small></div></li>
          </ol>
        </div>
      </div>
      )}
    </section>
  );
}
