import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Building2, CalendarClock, Check, Copy, Contact, FileSignature, Flag, Globe2, History, Mail, Megaphone, MessageCircle, NotebookPen, Package, Phone, Trash2, User,
} from 'lucide-react';

import {
  addQuoteNote, deleteQuoteNote, getCustomer, getQuoteAssignees, getQuoteById, getQuoteHistory, updateQuoteStatus, updateQuoteTracking,
} from '../../services/adminApi';
import { notifyQuotesChanged } from '../../services/adminAuth';
import useAdminApi from '../../hooks/useAdminApi';
import { formatMoney, offerNumber, offerTotals } from '../../data/offerText';
import usePageTitle from '../../hooks/usePageTitle';
import {
  LANGUAGE_LABELS, LOSS_REASONS, QUOTE_OUTCOMES, QUOTE_STATUSES, dayValue, followUpState, formatDate, outcomeLabel, quoteReference, statusLabel, statusTone, todayValue,
} from '../../components/admin/quoteStatus';
import Dropdown from '../../components/ui/Dropdown';

const FOLLOW_UP_LABELS = { overdue: 'Takip tarihi geçti', today: 'Takip Bugün', upcoming: 'Takip Planlandı' };

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

/* Other requests from the same customer, inside the customer card */
function CustomerSummary({ data, quote }) {
  if (data === null) return <p className="adNotesEmpty">Müşteri geçmişi yükleniyor…</p>;
  if (!data) return null;

  const others = data.quotes.filter((item) => item._id !== quote._id);
  const openOthers = others.filter((item) => !item.outcome && item.status !== 'closed');
  const link = `/admin/customer?${new URLSearchParams({ email: quote.email, company: quote.company, from: quote._id }).toString()}`;
  const { summary, lead } = data;

  return (
    <div className="adCustSummary">
      {openOthers.length > 0 && (
        <p className="adCustWarn">
          <AlertTriangle aria-hidden="true" />
          <span>
            Bu müşterinin açık {openOthers.length > 1 ? `${openOthers.length} talebi` : 'bir talebi'} daha var:{' '}
            <Link to={`/admin/quotes/${openOthers[0]._id}`}>{quoteReference(openOthers[0]._id)}</Link>
            {' '}({formatDate(openOthers[0].createdAt)}{openOthers[0].assignee ? `, sorumlu: ${openOthers[0].assignee}` : ''})
          </span>
        </p>
      )}

      {others.length ? (
        <>
          <dl className="adCustStats">
            <div><dt>Talep</dt><dd>{summary.total}</dd></div>
            <div><dt>Kazanılan</dt><dd>{summary.won}</dd></div>
            <div><dt>Kaybedilen</dt><dd>{summary.lost}</dd></div>
          </dl>
          <ul className="adCustMini">
            {others.slice(0, 3).map((item) => (
              <li key={item._id}>
                <Link to={`/admin/quotes/${item._id}`}>
                  <span>
                    <strong>{item.items?.length ? item.items.map((row) => row.name).join(', ') : item.product || 'Genel Talep'}</strong>
                    <small>{formatDate(item.createdAt)}{item.match === 'company' ? ` · ${item.name}` : ''}</small>
                  </span>
                  <span className={`adPill tone-${item.outcome ? (item.outcome === 'won' ? 'green' : 'red') : statusTone(item.status)}`}>
                    {item.outcome ? outcomeLabel(item.outcome) : statusLabel(item.status)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="adNotesEmpty">Bu müşteriden gelen ilk talep.</p>
      )}

      {lead && <p className="adCustLead">Kataloğu {lead.downloads || 1} kez indirdi (ilk: {formatDate(lead.createdAt)}).</p>}

      <Link to={link} className="cmsButton adCustOpen">
        Müşteri Kartını Aç
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}

/* One quote request: status steps, contact actions, products and message */
export default function AdminQuoteDetail() {
  usePageTitle('Teklif Talebi');

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
  const [outcomeNote, setOutcomeNote] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [history, setHistory] = useState(null);
  const [customer, setCustomer] = useState(null);

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
        setOutcomeNote(response.data?.outcomeNote || '');
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
      setOutcomeNote(response.data?.outcomeNote || '');
      notifyQuotesChanged();
    } catch (err) {
      setError(err.message || 'Durum güncellenemedi.');
    } finally {
      setSaving('');
    }
  }

  // Who did what on this request (refreshed after every change)
  const updatedAt = quote?.updatedAt;
  useEffect(() => {
    if (!updatedAt) return undefined;

    // The log entry is written just after the save answers: ask a moment later
    const timer = setTimeout(() => {
      call(getQuoteHistory, id)
        .then((response) => setHistory(Array.isArray(response.data) ? response.data : []))
        .catch(() => setHistory([]));
    }, 400);

    return () => clearTimeout(timer);
  }, [call, id, updatedAt]);

  // Customer card: other requests from this address or company
  const quoteEmail = quote?.email;
  const quoteCompany = quote?.company;
  useEffect(() => {
    if (!quoteEmail) return undefined;
    let cancelled = false;
    setCustomer(null);
    call(getCustomer, { email: quoteEmail, company: quoteCompany })
      .then((response) => { if (!cancelled) setCustomer(response.data); })
      .catch(() => { if (!cancelled) setCustomer(false); });
    return () => {
      cancelled = true;
    };
  }, [call, quoteEmail, quoteCompany]);

  // Suggestions for the assignee field (names used before)
  useEffect(() => {
    call(getQuoteAssignees).then((response) => setAssignees(Array.isArray(response.data) ? response.data : [])).catch(() => {});
  }, [call]);

  async function saveTracking(changes, key) {
    setSaving(key);
    setError('');

    try {
      const response = await call(updateQuoteTracking, id, changes);
      setQuote(response.data);
      setAssignee(response.data?.assignee || '');
      setOutcomeNote(response.data?.outcomeNote || '');
      if (changes.outcome !== undefined) notifyQuotesChanged();
    } catch (err) {
      setError(err.message || 'Takip bilgisi kaydedilemedi.');
    } finally {
      setSaving('');
    }
  }

  function chooseOutcome(outcome) {
    if (outcome === (quote.outcome || '')) return;
    if (outcome === '' && !window.confirm('Sonuç kaldırılsın mı? Talebin durumu değişmez.')) return;
    saveTracking({ outcome }, 'outcome');
  }

  function saveOutcomeNote() {
    if (outcomeNote.trim() !== (quote.outcomeNote || '')) saveTracking({ outcomeNote: outcomeNote.trim() }, 'outcomeNote');
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
        <Link to="/admin/quotes" className="adBack"><ArrowLeft aria-hidden="true" />Teklif Talepleri</Link>
        <div className="adState error">
          <h2>Talep Yüklenemedi</h2>
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
  const typed = assignee.trim().toLocaleLowerCase('tr');
  const suggestions = suggestOpen
    ? assignees.filter((name) => name !== assignee && name.toLocaleLowerCase('tr').includes(typed)).slice(0, 8)
    : [];
  const source = quote.attribution;
  const campaign = source && [source.utmCampaign, [source.utmSource, source.utmMedium].filter(Boolean).join(' / ')].filter(Boolean);
  const CLICK_LABELS = { gclid: 'Google Ads tıklaması', fbclid: 'Facebook / Instagram bağlantısı', msclkid: 'Microsoft Ads tıklaması' };

  return (
    <section className="adminContent adQuoteDetail">
      <Link to="/admin/quotes" className="adBack"><ArrowLeft aria-hidden="true" />Teklif Talepleri</Link>

      <header className="adDetailHead">
        <div>
          <span className="adDetailTags">
            <span className={`adPill tone-${statusTone(quote.status)}`}>{statusLabel(quote.status)}</span>
            {quote.outcome && <span className={`adPill tone-${quote.outcome === 'won' ? 'green' : 'red'}`}>{outcomeLabel(quote.outcome)}</span>}
            <span className="adRef">{quoteReference(quote._id)}</span>
            {followUp && <span className={`adFollowPill ${followUp}`}><CalendarClock aria-hidden="true" />{FOLLOW_UP_LABELS[followUp]} · {formatDate(quote.followUpAt)}</span>}
          </span>
          <h1>{quote.company}</h1>
          <p>{formatDate(quote.createdAt, true)} tarihinde {LANGUAGE_LABELS[quote.language] || quote.language || 'site'} sayfasından gönderildi</p>
        </div>

        <div className="adContactActions">
          <a className="cmsButton cmsButtonPrimary" href={`mailto:${quote.email}?subject=${subject}`}>
            <Mail aria-hidden="true" />
            E-posta Yaz
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
              <h2><Package aria-hidden="true" />İstenen Ürünler</h2>
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
                <div><dt>Ürün / konu</dt><dd>{quote.product || 'Genel Talep'}</dd></div>
                <div><dt>İstenen Kapasite</dt><dd>{quote.capacity || '—'}</dd></div>
                <div><dt>Adet</dt><dd>{quote.quantity || '—'}</dd></div>
              </dl>
            )}

            {quote.application && (
              <p className="adApplication"><span>Uygulama</span>{quote.application}</p>
            )}
          </div>

          {/* Commercial offer */}
          <div className="adCard adOfferCard">
            <div className="adCardHead">
              <h2><FileSignature aria-hidden="true" />Proforma Fatura</h2>
              {quote.offer && <span className="adHint" dir="ltr">{offerNumber(quote._id, quote.offer.revision)}</span>}
            </div>
            {quote.offer ? (
              <div className="adOfferSummary">
                <div>
                  <strong dir="ltr">{formatMoney(offerTotals(quote.offer).total, quote.offer.currency, 'tr')}</strong>
                  <small>
                    {quote.offer.lines.length} satır ·{' '}
                    {quote.offer.sentAt ? `${formatDate(quote.offer.sentAt, true)} tarihinde gönderildi` : `taslak, ${formatDate(quote.offer.savedAt, true)} kaydedildi`}
                  </small>
                </div>
                <Link to={`/admin/quotes/${quote._id}/offer`} className="cmsButton">Proformayı Aç</Link>
              </div>
            ) : (
              <div className="adOfferSummary">
                <p>İstenen ürünler hazır gelir; fiyat ve koşulları girip PDF indirin ya da müşteriye e-postayla gönderin.</p>
                <Link to={`/admin/quotes/${quote._id}/offer`} className="cmsButton cmsButtonPrimary">Proforma Hazırla</Link>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="adCard">
            <div className="adCardHead"><h2>Proje Detayları</h2></div>
            <p className="adMessage">{quote.message || '—'}</p>
          </div>

          {/* Internal notes */}
          <div className="adCard">
            <div className="adCardHead">
              <h2><NotebookPen aria-hidden="true" />İç Notlar</h2>
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
                  {saving === 'note' ? 'Kaydediliyor…' : 'Not Ekle'}
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
          <div className={`adCard adOutcomeCard ${quote.outcome || ''}`}>
            <div className="adCardHead">
              <h2><Flag aria-hidden="true" />Sonuç</h2>
              {quote.outcomeAt && <span className="adHint">{formatDate(quote.outcomeAt)}</span>}
            </div>

            <div className="adSegment adOutcomeSwitch" role="group" aria-label="Talebin sonucu">
              {[{ id: '', label: 'Açık' }, ...QUOTE_OUTCOMES].map((item) => (
                <button
                  key={item.id || 'open'}
                  type="button"
                  className={`${(quote.outcome || '') === item.id ? 'active' : ''} ${item.id}`}
                  aria-pressed={(quote.outcome || '') === item.id}
                  disabled={Boolean(saving)}
                  onClick={() => chooseOutcome(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {quote.outcome === 'lost' && (
              <div className="cmsField">
                <span>Kayıp Nedeni</span>
                <Dropdown
                  value={quote.lossReason || ''}
                  onChange={(lossReason) => saveTracking({ lossReason }, 'lossReason')}
                  placeholder="Seçin…"
                  label="Kayıp Nedeni"
                  options={LOSS_REASONS.map((reason) => ({ value: reason.id, label: reason.label }))}
                />
              </div>
            )}

            {quote.outcome && (
              <label className="cmsField">
                <span>{quote.outcome === 'won' ? 'Sipariş Notu' : 'Açıklama'}</span>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={outcomeNote}
                  placeholder={quote.outcome === 'won' ? 'ör. 3 adet RD 5000, sipariş no 2026/114' : 'ör. Rakip %8 daha ucuz verdi'}
                  onChange={(event) => setOutcomeNote(event.target.value)}
                  onBlur={saveOutcomeNote}
                />
                <small>{saving === 'outcomeNote' ? 'Kaydediliyor…' : 'Alandan çıkınca kaydedilir.'}</small>
              </label>
            )}

            <small className="cmsHint">
              {saving === 'outcome' || saving === 'lossReason'
                ? 'Kaydediliyor…'
                : quote.outcome
                  ? 'Satış raporunda kazanma oranı ve kayıp nedenlerine yansır.'
                  : 'Kazanıldı veya Kaybedildi seçildiğinde talep kapanır.'}
            </small>
          </div>

          <div className="adCard adTrackCard">
            <div className="adCardHead"><h2><CalendarClock aria-hidden="true" />Takip</h2></div>

            <div className="cmsField">
              <span id="assignee-label">Sorumlu Kişi</span>
              {/* Free text with suggestions from earlier requests (rounded list instead of the browser's) */}
              <div className="dd adSuggest">
                <input
                  role="combobox"
                  aria-labelledby="assignee-label"
                  aria-autocomplete="list"
                  aria-expanded={suggestions.length > 0}
                  aria-controls="assignee-suggestions"
                  value={assignee}
                  maxLength={80}
                  placeholder="ör. Ayşe (İhracat)"
                  autoComplete="off"
                  onChange={(event) => {
                    setAssignee(event.target.value);
                    setSuggestOpen(true);
                  }}
                  onFocus={() => setSuggestOpen(true)}
                  onBlur={() => {
                    setSuggestOpen(false);
                    saveAssignee();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      setSuggestOpen(false);
                      saveAssignee();
                    } else if (event.key === 'Escape') {
                      setSuggestOpen(false);
                    }
                  }}
                />
                {suggestions.length > 0 && (
                  <div className="ddPanel">
                    <ul className="ddList" id="assignee-suggestions" role="listbox" aria-labelledby="assignee-label">
                      {suggestions.map((name) => (
                        <li
                          key={name}
                          role="option"
                          aria-selected={false}
                          className="ddOption"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setAssignee(name);
                            setSuggestOpen(false);
                            if (name !== (quote.assignee || '')) saveTracking({ assignee: name }, 'assignee');
                          }}
                        >
                          <span>{name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <small>{saving === 'assignee' ? 'Kaydediliyor…' : 'Alandan çıkınca kaydedilir.'}</small>
            </div>

            <label className="cmsField">
              <span>Takip Tarihi</span>
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

          <div className="adCard adCustomerCard">
            <div className="adCardHead"><h2><Contact aria-hidden="true" />Müşteri Kartı</h2></div>
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
            <CustomerSummary data={customer} quote={quote} />
          </div>

          <div className="adCard">
            <div className="adCardHead"><h2><Megaphone aria-hidden="true" />Talebin Kaynağı</h2></div>
            {source ? (
              <dl className="adFacts compact adSourceFacts">
                <div><dt>Kanal</dt><dd><span className="adChannel">{source.channel || 'Doğrudan'}</span></dd></div>
                {campaign?.length > 0 && <div><dt>Kampanya</dt><dd>{campaign.join(' · ')}</dd></div>}
                {source.utmTerm && <div><dt>Anahtar Kelime</dt><dd>{source.utmTerm}</dd></div>}
                {source.clickId && <div><dt>Reklam</dt><dd>{CLICK_LABELS[source.clickId]}</dd></div>}
                {source.referrer && <div><dt>Geldiği Site</dt><dd dir="ltr">{source.referrer}</dd></div>}
                {source.landingPage && <div><dt>İlk Sayfa</dt><dd><a href={source.landingPage} target="_blank" rel="noreferrer" dir="ltr">{source.landingPage}</a></dd></div>}
                {source.submitPage && source.submitPage !== source.landingPage && <div><dt>Form Sayfası</dt><dd><a href={source.submitPage} target="_blank" rel="noreferrer" dir="ltr">{source.submitPage}</a></dd></div>}
                {source.firstSeenAt && <div><dt>İlk Ziyaret</dt><dd>{formatDate(source.firstSeenAt, true)}</dd></div>}
              </dl>
            ) : (
              <p className="adNotesEmpty">Bu talep, kaynak bilgisi kaydedilmeye başlanmadan önce geldi.</p>
            )}
          </div>

          <div className="adCard adHistoryCard">
            <div className="adCardHead"><h2><History aria-hidden="true" />Geçmiş</h2></div>
            {history === null ? (
              <p className="adNotesEmpty">Yükleniyor…</p>
            ) : history.length ? (
              <ol className="adHistory">
                {history.slice(0, 12).map((entry) => (
                  <li key={entry._id}>
                    <strong>{entry.action}</strong>
                    {entry.details && <span>{entry.details}</span>}
                    <small>{entry.user?.name || entry.user?.email} · {formatDate(entry.at, true)}</small>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="adNotesEmpty">Bu talepte henüz panelden bir işlem yapılmadı.</p>
            )}
          </div>

          <div className="adCard">
            <div className="adCardHead"><h2>Kayıt Bilgileri</h2></div>
            <dl className="adFacts compact">
              <div><dt>Referans</dt><dd>{quoteReference(quote._id)}</dd></div>
              <div><dt>Site Dili</dt><dd>{LANGUAGE_LABELS[quote.language] || quote.language || '—'}</dd></div>
              <div><dt>Kaynak</dt><dd>{quote.source === 'website' ? 'Web sitesi' : quote.source || '—'}</dd></div>
              <div><dt>Oluşturuldu</dt><dd>{formatDate(quote.createdAt, true)}</dd></div>
              <div><dt>Son Güncelleme</dt><dd>{formatDate(quote.updatedAt, true)}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
