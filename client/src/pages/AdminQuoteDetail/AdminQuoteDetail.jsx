import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, Check, Copy, Globe2, Mail, MessageCircle, Package, Phone, User,
} from 'lucide-react';

import { getQuoteById, updateQuoteStatus } from '../../services/adminApi';
import { notifyQuotesChanged } from '../../services/adminAuth';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { LANGUAGE_LABELS, QUOTE_STATUSES, formatDate, statusLabel, statusTone } from '../../components/admin/quoteStatus';

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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const response = await call(getQuoteById, id);
        if (cancelled) return;
        setQuote(response.data);
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

  return (
    <section className="adminContent adQuoteDetail">
      <Link to="/admin/quotes" className="adBack"><ArrowLeft aria-hidden="true" />Teklif talepleri</Link>

      <header className="adDetailHead">
        <div>
          <span className={`adPill tone-${statusTone(quote.status)}`}>{statusLabel(quote.status)}</span>
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
        </div>

        <aside className="adDetailSide">
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
