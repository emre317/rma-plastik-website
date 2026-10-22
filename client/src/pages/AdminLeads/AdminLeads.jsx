import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Download, FileDown, Inbox, MailCheck, Search, Trash2,
} from 'lucide-react';

import { deleteLead, exportLeads, getLeads, markLeadsRead } from '../../services/adminApi';
import { notifyQuotesChanged } from '../../services/adminAuth';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { LANGUAGE_LABELS, formatDate, timeAgo } from '../../components/admin/quoteStatus';
import { exportLeadsFile } from '../AdminQuotes/quoteExcel';
import Dropdown from '../../components/ui/Dropdown';
import { useConfirm } from '../../components/ui/ConfirmDialog';

const PAGE_SIZE = 20;

/* Visitors who left their e-mail to download the catalogue */
export default function AdminLeads() {
  usePageTitle('Potansiyel Müşteriler');

  const call = useAdminApi();
  const confirm = useConfirm();

  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [consent, setConsent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [exporting, setExporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Debounced search
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
        const response = await call(getLeads, { page, limit: PAGE_SIZE, search, consent });
        if (cancelled) return;
        setLeads(Array.isArray(response.data) ? response.data : []);
        setPagination(response.pagination || { page: 1, pages: 1, total: 0 });

        // Seen: the sidebar badge goes away
        if (response.unread) {
          await call(markLeadsRead).catch(() => {});
          notifyQuotesChanged();
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [call, page, search, consent, reloadKey]);

  async function download() {
    setExporting(true);
    setNote('');

    try {
      const response = await call(exportLeads, { search, consent });
      const count = await exportLeadsFile(response.data || []);
      setNote(`${count} kayıt Excel dosyasına aktarıldı.`);
    } catch (err) {
      setNote(err.message || 'Dışa aktarılamadı.');
    } finally {
      setExporting(false);
    }
  }

  async function remove(lead) {
    if (!(await confirm({ title: 'Kayıt silinsin mi?', message: `${lead.email} kaydı kalıcı olarak silinir (ör. kişi verilerinin silinmesini istediyse).`, confirmLabel: 'Kaydı Sil', tone: 'danger' }))) return;

    try {
      await call(deleteLead, lead._id);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Kayıt silinemedi.');
    }
  }

  const filtered = Boolean(search) || Boolean(consent);

  return (
    <section className="adminContent adLeads">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Satış</span>
          <h1>Potansiyel Müşteriler</h1>
          <p>Siteden ürün kataloğunu e-posta adresiyle indiren ziyaretçiler. Aynı adresle teklif talebi gelmişse talebe bağlantı görünür.</p>
        </div>
      </header>

      <div className="adToolbar">
        <label className="adSearch">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="E-posta, kişi, firma veya ülke ara…"
            aria-label="Potansiyel müşterilerde ara"
          />
        </label>
        <Dropdown
          className="adDd"
          icon={MailCheck}
          value={consent}
          onChange={(value) => { setConsent(value); setPage(1); }}
          label="E-posta iznine göre filtrele"
          options={[{ value: '', label: 'Tümü' }, { value: 'yes', label: 'E-posta İzni Verenler' }]}
        />
        <span className="adToolbarCount">{pagination.total} kayıt</span>
        <button type="button" className="cmsButton cmsButtonInfo" onClick={download} disabled={exporting || !pagination.total}>
          <Download aria-hidden="true" />
          {exporting ? 'Hazırlanıyor…' : 'Excel’e aktar'}
        </button>
      </div>

      {note && <p className="adExportNote" role="status">{note}</p>}
      {error && <div className="adminInlineError" role="alert">{error}</div>}

      {loading && <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>}

      {!loading && !error && leads.length === 0 && (
        <div className="adState">
          <span className="adStateIcon" aria-hidden="true"><Inbox /></span>
          <h2>{filtered ? 'Bu filtreye uyan kayıt yok' : 'Henüz kayıt yok'}</h2>
          <p>Ziyaretçiler sitedeki “Kataloğu İndir” bağlantılarından e-posta adresini bırakarak kataloğu indirdiğinde burada listelenir.</p>
        </div>
      )}

      {!loading && leads.length > 0 && (
        <>
          <div className="adTable adLeadTable" role="table" aria-label="Potansiyel müşteriler">
            <div className="adTableHead" role="row">
              <span role="columnheader">Kişi / firma</span>
              <span role="columnheader">Kaynak</span>
              <span role="columnheader">Durum</span>
              <span role="columnheader">Son İndirme</span>
              <span role="columnheader"><span className="visuallyHidden">İşlem</span></span>
            </div>

            {leads.map((lead) => (
              <div key={lead._id} className={`adTableRow ${!lead.isRead ? 'unread' : ''}`} role="row">
                <span className="adTableMain" role="cell">
                  <span className="adAvatarSm" aria-hidden="true">{(lead.company || lead.name || lead.email).charAt(0).toLocaleUpperCase('tr')}</span>
                  <span>
                    <strong>
                      {!lead.isRead && <i className="adUnreadDot" aria-label="Yeni" />}
                      <a href={`mailto:${lead.email}`}>{lead.email}</a>
                    </strong>
                    <small>{[lead.name, lead.company, lead.country, LANGUAGE_LABELS[lead.language]].filter(Boolean).join(' · ') || '—'}</small>
                  </span>
                </span>
                <span role="cell">
                  <span className="adChannel">{lead.attribution?.channel || 'Doğrudan'}</span>
                  {lead.attribution?.utmCampaign && <small className="adLeadCampaign">{lead.attribution.utmCampaign}</small>}
                </span>
                <span role="cell" className="adLeadTags">
                  {lead.quotes > 0 ? (
                    <Link to={`/admin/quotes/${lead.lastQuoteId}`} className="adPill tone-green">{lead.quotes} teklif talebi</Link>
                  ) : (
                    <span className="adPill tone-gray">Talep yok</span>
                  )}
                  {lead.marketingConsent && <span className="adPill tone-blue" title={`İzin: ${formatDate(lead.consentAt, true)}`}>E-posta izni</span>}
                </span>
                <span className="adTableDate" role="cell" title={formatDate(lead.lastDownloadAt, true)}>
                  {timeAgo(lead.lastDownloadAt)}
                  {lead.downloads > 1 && <small><FileDown aria-hidden="true" />{lead.downloads} indirme</small>}
                </span>
                <span role="cell">
                  <button type="button" className="adIconButton danger" onClick={() => remove(lead)} aria-label={`${lead.email} kaydını sil`} title="Sil">
                    <Trash2 aria-hidden="true" />
                  </button>
                </span>
              </div>
            ))}
          </div>

          {pagination.pages > 1 && (
            <nav className="adPager" aria-label="Sayfalar">
              <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Önceki sayfa">
                <ChevronLeft aria-hidden="true" />
              </button>
              <span>Sayfa {pagination.page} / {pagination.pages}</span>
              <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pagination.pages} aria-label="Sonraki sayfa">
                <ChevronRight aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
