import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, CalendarClock, Check, Copy, Globe2, Mail, MessageCircle, NotebookPen, Package, Phone, Trash2, User,
} from 'lucide-react';

import {
  addQuoteNote, deleteQuoteNote, getQuoteAssignees, getQuoteById, updateQuoteStatus, updateQuoteTracking,
} from '../../services/adminApi';
import { notifyQuotesChanged } from '../../services/adminAuth';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import {
  LANGUAGE_LABELS, QUOTE_STATUSES, dayValue, followUpState, formatDate, quoteReference, statusLabel, statusTone, todayValue,
} from '../../components/admin/quoteStatus';

const FOLLOW_UP_LABELS = { overdue: 'Takip tarihi geçti', today: 'Takip bugün', upcoming: 'Takip planlandı' };

// "2026-03-14" + n days
function addDays(days) {
  const date = new Date(`${todayValue()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const QUICK_DATES = [
  { label: 'Yarın', days: 1 },
  { label: '3 gün', days: 3 },
  { label: '1 hafta', days: 7 },
  { label: '2 hafta', days: 14 },
];

/* One quote request: status steps, contact actions, products and message */
export default function AdminQuoteDetail() {
  usePageTitle('Teklif talebi');

  const { id } = useParams();
  const call = useAdminApi();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [assignee, setAssignee] = useState('');
  const [assignees, setAssignees] = useState([]);
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const response = await call(getQuoteById, id);
        if (cancelled) return;
        setQuote(response.data);
        setAssignee(response.data?.assignee || '');
        // Opening a request marks it as read on the server
        notifyQuotesChanged();
      } catch (err) {
        if (!cancelled) setError(err.message || 'Teklif talebi yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [call, id]);

  async function changeStatus(status) {
    if (!quote || status === quote.status) return;

    setSaving(status);
    setError('');

    try {
      const response = await call(updateQuoteStatus, id, status);
      setQuote(response.data);
      notifyQuotesChanged();
    } catch (err) {
      setError(err.message || 'Durum güncellenemedi.');
    } finally {
      setSaving('');
    }
  }

  // Suggestions for the assignee field (names used before)
  useEffect(() => {
    call(getQuoteAssignees).then((response) => setAssignees(response.data || [])).catch(() => {});
  }, [call]);

  async function saveTracking(changes, key) {
    setSaving(key);
    setError('');

    try {
      const response = await call(updateQuoteTracking, id, changes);
      setQuote(response.data);
      setAssignee(response.data?.assignee || '');
    } catch (err) {
      setError(err.message || 'Takip bilgisi kaydedilemedi.');
    } finally {
      setSaving('');
    }
  }

  function saveAssignee() {
    if (assignee.trim() !== (quote.assignee || '')) saveTracking({ assignee: assignee.trim() }, 'assignee');
  }

  async function submitNote(event) {
    event.preventDefault();
    if (!note.trim()) return;

    setSaving('note');
    setError('');

    try {
      const response = await call(addQuoteNote, id, note.trim());
      setQuote(response.data);
      setNote('');
    } catch (err) {
      setError(err.message || 'Not kaydedilemedi.');
    } finally {
      setSaving('');
    }
  }

  async function removeNote(noteId) {
    if (!window.confirm('Bu not silinsin mi?')) return;

    try {
      const response = await call(deleteQuoteNote, id, noteId);
      setQuote(response.data);
    } catch (err) {
      setError(err.message || 'Not silinemedi.');
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(quote.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: nothing to do
    }
  }

  if (loading) {
    return (
      <section className="adminContent">
        <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>
      </section>
    );
  }

  if (!quote) {
    return (
      <section className="adminContent">
        <Link to="/admin/quotes" className="adBack"><ArrowLeft aria-hidden="true" />Teklif talepleri</Link>
        <div className="adState error">
          <h2>Talep yüklenemedi</h2>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  const currentIndex = QUOTE_STATUSES.findIndex((status) => status.id === quote.status);
  const phoneDigits = String(quote.phone || '').replace(/\D/g, '');
  const subject = encodeURIComponent(`RMA Plastik – Teklif talebiniz${quote.product ? ` (${quote.product})` : ''}`);
  const items = Array.isArray(quote.items) ? quote.items : [];
  const totalPieces = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const notes = [...(quote.notes || [])].reverse();
  const followUp = followUpState(quote);

  return (
    <section className="adminContent adQuoteDetail">
      <Link to="/admin/quotes" className="adBack"><ArrowLeft aria-hidden="true" />Teklif talepleri</Link>

      <header className="adDetailHead">
        <div>
          <span className="adDetailTags">
            <span className={`adPill tone-${statusTone(quote.status)}`}>{statusLabel(quote.status)}</span>
            <span className="adRef">{quoteReference(quote._id)}</span>
            {followUp && <span className={`adFollowPill ${followUp}`}><CalendarClock aria-hidden="true" />{FOLLOW_UP_LABELS[followUp]} · {formatDate(quote.followUpAt)}</span>}
          </span>
          <h1>{quote.company}</h1>
          <p>{formatDate(quote.createdAt, true)} tarihinde {LANGUAGE_LABELS[quote.language] || quote.language || 'site'} sayfasından gönderildi</p>
        </div>

        <div className="adContactActions">
          <a className="cmsButton cmsButtonPrimary" href={`mailto:${quote.email}?subject=${subject}`}>
            <Mail aria-hidden="true" />
            E-posta yaz
          </a>
          {quote.phone && (
            <a className="cmsButton" href={`tel:${quote.phone.replace(/\s/g, '')}`}>
              <Phone aria-hidden="true" />
              Ara
            </a>
          )}
          {phoneDigits.length >= 10 && (
            <a className="cmsButton adWhatsapp" href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden="true" />
              WhatsApp
            </a>
          )}
        </div>
      </header>

      {/* Status steps */}
      <ol className="adSteps" aria-label="Talep durumu">
        {QUOTE_STATUSES.map((status, index) => {
          const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : '';

          return (
            <li key={status.id} className={state}>
              <button type="button" onClick={() => changeStatus(status.id)} disabled={Boolean(saving)} aria-current={state === 'current' ? 'step' : undefined}>
                <span className="adStepMark" aria-hidden="true">
                  {state === 'done' ? <Check /> : index + 1}
                </span>
                <span className="adStepText">
                  <strong>{status.label}</strong>
                  <small>{saving === status.id ? 'Kaydediliyor…' : status.hint}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {error && <div className="adminInlineError" role="alert">{error}</div>}

      <div className="adDetailGrid">
        <div className="adDetailMain">
          {/* Products */}
          <div className="adCard">
            <div className="adCardHead">
              <h2><Package aria-hidden="true" />İstenen ürünler</h2>
              {items.length > 0 && <span className="adHint">{items.length} model · {totalPieces} adet</span>}
            </div>

            {items.length > 0 ? (
              <ul className="adItems">
                {items.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    <span className="adItemImage">
                      {item.image ? <img src={item.image} alt="" loading="lazy" /> : <Package aria-hidden="true" />}
                    </span>
                    <span className="adItemText">
                      <strong>{item.name}</strong>
                      {item.details && <small>{item.details}</small>}
                    </span>
                    <span className="adItemQty">× {item.quantity || 1}</span>
                  </li>
                ))}
              </ul>
            ) : quote.productDetails || quote.productImage ? (
              <ul className="adItems">
                <li>
                  <span className="adItemImage">
                    {quote.productImage ? <img src={quote.productImage} alt="" loading="lazy" /> : <Package aria-hidden="true" />}
                  </span>
                  <span className="adItemText">
                    <strong>{quote.product || '—'}</strong>
                    <small>{quote.productDetails}</small>
                  </span>
                  {quote.quantity && <span className="adItemQty">× {quote.quantity}</span>}
                </li>
              </ul>
            ) : (
              <dl className="adFacts">
                <div><dt>Ürün / konu</dt><dd>{quote.product || 'Genel talep'}</dd></div>
                <div><dt>İstenen kapasite</dt><dd>{quote.capacity || '—'}</dd></div>
                <div><dt>Adet</dt><dd>{quote.quantity || '—'}</dd></div>
              </dl>
            )}

            {quote.application && (
              <p className="adApplication"><span>Uygulama</span>{quote.application}</p>
            )}
          </div>

          {/* Message */}
          <div className="adCard">
            <div className="adCardHead"><h2>Proje detayları</h2></div>
            <p className="adMessage">{quote.message || '—'}</p>
          </div>

          {/* Internal notes */}
          <div className="adCard">
            <div className="adCardHead">
              <h2><NotebookPen aria-hidden="true" />İç notlar</h2>
              <span className="adHint">Müşteri görmez</span>
            </div>

            <form className="adNoteForm" onSubmit={submitNote}>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="ör. Telefonla görüşüldü, 2 adet RD 5000 için fiyat istendi. Nakliye Mersin limanı."
                aria-label="Yeni not"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submitNote(event);
                }}
              />
              <div className="adNoteActions">
                <small>Ctrl + Enter ile kaydedin</small>
                <button type="submit" className="cmsButton cmsButtonPrimary" disabled={!note.trim() || saving === 'note'}>
                  {saving === 'note' ? 'Kaydediliyor…' : 'Not ekle'}
                </button>
              </div>
            </form>

            {notes.length > 0 ? (
              <ol className="adNotes">
                {notes.map((item) => (
                  <li key={item._id}>
                    <div className="adNoteMeta">
                      <strong>{item.author || 'Yönetici'}</strong>
                      <time dateTime={item.createdAt}>{formatDate(item.createdAt, true)}</time>
                      <button type="button" className="adIconButton" onClick={() => removeNote(item._id)} aria-label="Notu sil" title="Sil">
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                    <p>{item.text}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="adNotesEmpty">Henüz not yok. Görüşmeleri, fiyatları ve sonraki adımı buraya yazın.</p>
            )}
          </div>
        </div>

        <aside className="adDetailSide">
          <div className="adCard adTrackCard">
            <div className="adCardHead"><h2><CalendarClock aria-hidden="true" />Takip</h2></div>

            <label className="cmsField">
              <span>Sorumlu kişi</span>
              <input
                list="quote-assignees"
                value={assignee}
                maxLength={80}
                placeholder="ör. Ayşe (İhracat)"
                onChange={(event) => setAssignee(event.target.value)}
                onBlur={saveAssignee}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    saveAssignee();
                  }
                }}
              />
              <datalist id="quote-assignees">
                {assignees.map((name) => <option key={name} value={name} />)}
              </datalist>
              <small>{saving === 'assignee' ? 'Kaydediliyor…' : 'Alandan çıkınca kaydedilir.'}</small>
            </label>

            <label className="cmsField">
              <span>Takip tarihi</span>
              <input
                type="date"
                value={dayValue(quote.followUpAt)}
                onChange={(event) => saveTracking({ followUpAt: event.target.value || null }, 'followUp')}
              />
            </label>

            <div className="adQuickDates">
              {QUICK_DATES.map((item) => (
                <button key={item.days} type="button" className="adChip" disabled={Boolean(saving)} onClick={() => saveTracking({ followUpAt: addDays(item.days) }, 'followUp')}>
                  {item.label}
                </button>
              ))}
              {quote.followUpAt && (
                <button type="button" className="adChip danger" disabled={Boolean(saving)} onClick={() => saveTracking({ followUpAt: null }, 'followUp')}>
                  Temizle
                </button>
              )}
            </div>
            <small className="cmsHint">
              {saving === 'followUp' ? 'Kaydediliyor…' : 'Tarihi gelen talepler Özet sayfasında ve listede “Takibi gelen” filtresinde görünür.'}
            </small>
          </div>

          <div className="adCard">
            <div className="adCardHead"><h2>Müşteri</h2></div>
            <ul className="adContactList">
              <li><Building2 aria-hidden="true" /><span><small>Firma</small><strong>{quote.company}</strong></span></li>
              <li><User aria-hidden="true" /><span><small>Yetkili</small><strong>{quote.name}</strong></span></li>
              <li>
                <Mail aria-hidden="true" />
                <span><small>E-posta</small><a href={`mailto:${quote.email}`}>{quote.email}</a></span>
                <button type="button" className="adIconButton" onClick={copyEmail} aria-label="E-postayı kopyala" title="Kopyala">
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                </button>
              </li>
              <li><Phone aria-hidden="true" /><span><small>Telefon</small>{quote.phone ? <a href={`tel:${quote.phone.replace(/\s/g, '')}`} dir="ltr">{quote.phone}</a> : <strong>—</strong>}</span></li>
              <li><Globe2 aria-hidden="true" /><span><small>Ülke</small><strong>{quote.country || '—'}</strong></span></li>
            </ul>
          </div>

          <div className="adCard">
            <div className="adCardHead"><h2>Kayıt bilgileri</h2></div>
            <dl className="adFacts compact">
              <div><dt>Referans</dt><dd>{quoteReference(quote._id)}</dd></div>
              <div><dt>Site dili</dt><dd>{LANGUAGE_LABELS[quote.language] || quote.language || '—'}</dd></div>
              <div><dt>Kaynak</dt><dd>{quote.source === 'website' ? 'Web sitesi' : quote.source || '—'}</dd></div>
              <div><dt>Oluşturuldu</dt><dd>{formatDate(quote.createdAt, true)}</dd></div>
              <div><dt>Son güncelleme</dt><dd>{formatDate(quote.updatedAt, true)}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
