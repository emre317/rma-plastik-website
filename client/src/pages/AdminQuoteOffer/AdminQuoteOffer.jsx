import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Download, Mail, Plus, Save, Trash2,
} from 'lucide-react';

import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { getAdminUser, notifyQuotesChanged } from '../../services/adminAuth';
import { getQuoteById, saveQuoteOffer, sendQuoteOffer } from '../../services/adminApi';
import { getSettings } from '../../services/adminContentApi';
import { SITE_URL } from '../../seo/site';
import { dayValue, formatDate, todayValue } from '../../components/admin/quoteStatus';
import builtInCompany from '../../data/company';
import {
  INCOTERMS, OFFER_CURRENCIES, formatMoney, offerNumber, offerTotals,
} from '../../data/offerText';
import OfferDocument from './OfferDocument';
import { downloadBlob, makeOfferPdf } from './offerPdf';

const LANGS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
];

const VAT_PRESETS = [20, 10, 1];

const emptyLine = () => ({ name: '', details: '', quantity: 1, unit: '', unitPrice: 0, discount: 0 });

// "2026-03-14" + n days
function addDays(days) {
  const date = new Date(`${todayValue()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/* New offer: the requested products with empty prices (prices are entered by the sales team) */
function draftFromQuote(quote, settings) {
  const items = Array.isArray(quote.items) && quote.items.length
    ? quote.items.map((item) => ({ ...emptyLine(), name: item.name, details: item.details || '', quantity: item.quantity || 1 }))
    : [{ ...emptyLine(), name: quote.product || '', details: quote.productDetails || '', quantity: quote.quantity || 1 }];

  const language = ['tr', 'en', 'ar'].includes(quote.language) ? quote.language : 'tr';

  return {
    language,
    currency: language === 'tr' ? 'TRY' : 'USD',
    lines: items,
    vatRate: null,
    incoterm: '',
    deliveryPlace: '',
    deliveryTime: '',
    paymentTerms: '',
    validUntil: '',
    notes: '',
    terms: settings?.offerTerms || '',
    preparedBy: quote.assignee || getAdminUser()?.name || '',
    revision: 1,
  };
}

function fromSaved(offer) {
  return {
    ...offer,
    validUntil: dayValue(offer.validUntil),
    vatRate: offer.vatRate ?? null,
    lines: (offer.lines || []).map((line) => ({ ...emptyLine(), ...line })),
  };
}

/* Offer editor (Teklif hazırla): prices and terms, live A4 preview, PDF and e-mail */
export default function AdminQuoteOffer() {
  usePageTitle('Teklif hazırla');

  const { id } = useParams();
  const call = useAdminApi();
  const docRef = useRef(null);
  const paperRef = useRef(null);
  const [scale, setScale] = useState(0.6);

  const [quote, setQuote] = useState(null);
  const [settings, setSettings] = useState(null);
  const [offer, setOffer] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);
  const [confirmSend, setConfirmSend] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [quoteResponse, settingsResponse] = await Promise.all([
          call(getQuoteById, id),
          call(getSettings).catch(() => ({ data: {} })),
        ]);
        if (cancelled) return;
        setQuote(quoteResponse.data);
        setSettings(settingsResponse.data || {});
        setOffer(quoteResponse.data.offer ? fromSaved(quoteResponse.data.offer) : draftFromQuote(quoteResponse.data, settingsResponse.data));
      } catch (err) {
        if (!cancelled) setMessage({ type: 'error', text: err.message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [call, id]);

  // The preview is the A4 document (794 px) scaled to the column width
  useEffect(() => {
    const element = paperRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / 794)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [offer === null]);

  // Company block of the document: saved settings, otherwise the site defaults
  const company = useMemo(() => {
    const s = settings || {};
    return {
      legalName: s.companyLegalName || '',
      taxInfo: s.taxInfo || '',
      bankInfo: s.offerBankInfo || '',
      street: s.addressStreet || builtInCompany.address.street,
      district: s.addressDistrict || builtInCompany.address.district,
      country: s.addressCountry || builtInCompany.address.country,
      phone: s.phoneDisplay || builtInCompany.phone.display,
      email: s.email || builtInCompany.email,
      website: SITE_URL.replace(/^https?:\/\//, ''),
    };
  }, [settings]);

  const update = (changes) => {
    setOffer((current) => ({ ...current, ...changes }));
    setDirty(true);
  };

  const updateLine = (index, changes) =>
    update({ lines: offer.lines.map((line, position) => (position === index ? { ...line, ...changes } : line)) });

  const moveLine = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= offer.lines.length) return;
    const lines = [...offer.lines];
    [lines[index], lines[target]] = [lines[target], lines[index]];
    update({ lines });
  };

  async function save() {
    setBusy('save');
    setMessage(null);

    try {
      const { data } = await call(saveQuoteOffer, id, offer);
      setQuote(data);
      setOffer(fromSaved(data.offer));
      setDirty(false);
      setMessage({ type: 'success', text: `Teklif ${offerNumber(data._id, data.offer.revision)} kaydedildi.` });
      return data;
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      return null;
    } finally {
      setBusy('');
    }
  }

  async function pdfBlob() {
    // The full-size document (not the scaled preview) is drawn
    return makeOfferPdf(docRef.current);
  }

  async function download() {
    setBusy('pdf');
    setMessage(null);

    try {
      const blob = await pdfBlob();
      downloadBlob(blob, `${offerNumber(quote._id, offer.revision)}.pdf`);
    } catch (err) {
      setMessage({ type: 'error', text: `PDF oluşturulamadı: ${err.message}` });
    } finally {
      setBusy('');
    }
  }

  async function send() {
    setConfirmSend(false);

    // Always send what is on screen: save first when something changed
    let saved = quote;
    if (dirty || !quote.offer) {
      saved = await save();
      if (!saved) return;
    }

    setBusy('send');
    setMessage(null);

    try {
      // Wait for the re-render so the document shows the saved revision number
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const blob = await pdfBlob();
      const { data } = await call(sendQuoteOffer, id, blob, `${offerNumber(saved._id, saved.offer.revision)}.pdf`);
      setQuote(data);
      setOffer(fromSaved(data.offer));
      setDirty(false);
      notifyQuotesChanged();
      setMessage({ type: 'success', text: `Teklif ${data.email} adresine gönderildi. Talep “Teklif verildi” durumuna alındı.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  if (!offer || !quote) {
    return (
      <section className="adminContent">
        <Link to={`/admin/quotes/${id}`} className="adBack"><ArrowLeft aria-hidden="true" />Talebe dön</Link>
        {message ? <div className={`cmsMessage ${message.type}`}>{message.text}</div> : <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>}
      </section>
    );
  }

  const totals = offerTotals(offer);
  const money = (value) => formatMoney(value, offer.currency, offer.language);
  const missingPrice = offer.lines.some((line) => !Number(line.unitPrice));
  const number = offerNumber(quote._id, offer.revision);
  const sentInfo = quote.offer?.sentAt ? `${formatDate(quote.offer.sentAt, true)} tarihinde ${quote.offer.sentTo} adresine gönderildi` : '';

  return (
    <section className="adminContent adOffer">
      <Link to={`/admin/quotes/${id}`} className="adBack"><ArrowLeft aria-hidden="true" />{quote.company}</Link>

      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Teklif</span>
          <h1>{number}</h1>
          <p>
            {quote.company} için fiyat teklifi. Fiyatları ve koşulları siz girersiniz; sağdaki önizleme PDF’in aynısıdır.
            {sentInfo && <><br /><strong>{sentInfo}.</strong> Değişiklik yapıp kaydederseniz yeni revizyon (R{(quote.offer.revision || 1) + 1}) oluşur.</>}
          </p>
        </div>
      </header>

      {message && <div className={`cmsMessage ${message.type}`}>{message.text}</div>}

      <div className="adOfferGrid">
        <div className="adOfferForm">
          {/* Document */}
          <div className="adCard">
            <div className="adCardHead"><h2>Belge</h2></div>
            <div className="adOfferRow">
              <label className="cmsField">
                <span>Teklif dili</span>
                <select value={offer.language} onChange={(event) => update({ language: event.target.value })}>
                  {LANGS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                </select>
              </label>
              <label className="cmsField">
                <span>Para birimi</span>
                <select value={offer.currency} onChange={(event) => update({ currency: event.target.value })}>
                  {OFFER_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </label>
              <label className="cmsField">
                <span>Geçerlilik tarihi</span>
                <input type="date" value={offer.validUntil || ''} onChange={(event) => update({ validUntil: event.target.value })} />
              </label>
            </div>
            <div className="adQuickDates">
              {[15, 30, 60].map((days) => (
                <button key={days} type="button" className="adChip" onClick={() => update({ validUntil: addDays(days) })}>{days} gün</button>
              ))}
            </div>
            <label className="cmsField">
              <span>Hazırlayan</span>
              <input value={offer.preparedBy} maxLength={120} onChange={(event) => update({ preparedBy: event.target.value })} placeholder="ör. Ayşe Demir – İhracat" />
            </label>
          </div>

          {/* Lines */}
          <div className="adCard">
            <div className="adCardHead">
              <h2>Ürünler ve fiyatlar</h2>
              <span className="adHint">{offer.lines.length} satır</span>
            </div>

            <ol className="adOfferLines">
              {offer.lines.map((line, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={index}>
                  <div className="adOfferLineHead">
                    <span className="adOfferLineIndex">{index + 1}</span>
                    <input className="adOfferName" value={line.name} maxLength={200} placeholder="Ürün / hizmet adı" aria-label="Ürün adı" onChange={(event) => updateLine(index, { name: event.target.value })} />
                    <span className="adOfferLineTools">
                      <button type="button" className="adIconButton" onClick={() => moveLine(index, -1)} disabled={index === 0} aria-label="Yukarı">↑</button>
                      <button type="button" className="adIconButton" onClick={() => moveLine(index, 1)} disabled={index === offer.lines.length - 1} aria-label="Aşağı">↓</button>
                      <button type="button" className="adIconButton" onClick={() => update({ lines: offer.lines.filter((_, position) => position !== index) })} disabled={offer.lines.length === 1} aria-label="Satırı sil"><Trash2 aria-hidden="true" /></button>
                    </span>
                  </div>
                  <input className="adOfferDetails" value={line.details} maxLength={600} placeholder="Açıklama (ölçü, renk, aksesuar…)" aria-label="Açıklama" onChange={(event) => updateLine(index, { details: event.target.value })} />
                  <div className="adOfferNumbers">
                    <label><span>Miktar</span><input type="number" min="0" step="any" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} /></label>
                    <label><span>Birim</span><input value={line.unit} maxLength={20} placeholder="adet" onChange={(event) => updateLine(index, { unit: event.target.value })} /></label>
                    <label><span>Birim fiyat ({offer.currency})</span><input type="number" min="0" step="any" value={line.unitPrice} className={!Number(line.unitPrice) ? 'empty' : ''} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} /></label>
                    <label><span>İskonto %</span><input type="number" min="0" max="100" step="any" value={line.discount} onChange={(event) => updateLine(index, { discount: event.target.value })} /></label>
                    <span className="adOfferAmount"><small>Tutar</small><strong dir="ltr">{money(totals.lines[index])}</strong></span>
                  </div>
                </li>
              ))}
            </ol>

            <button type="button" className="cmsButton adOfferAdd" onClick={() => update({ lines: [...offer.lines, emptyLine()] })}>
              <Plus aria-hidden="true" />
              Satır ekle (ürün, nakliye, kalıp…)
            </button>

            <div className="adOfferVat">
              <span>KDV</span>
              <div className="adQuickDates">
                <button type="button" className={`adChip ${offer.vatRate === null ? 'active' : ''}`} onClick={() => update({ vatRate: null })}>Gösterme</button>
                {VAT_PRESETS.map((rate) => (
                  <button key={rate} type="button" className={`adChip ${Number(offer.vatRate) === rate && offer.vatRate !== null ? 'active' : ''}`} onClick={() => update({ vatRate: rate })}>%{rate}</button>
                ))}
              </div>
            </div>

            <dl className="adOfferTotals">
              {totals.hasVat && <div><dt>Ara toplam</dt><dd dir="ltr">{money(totals.subtotal)}</dd></div>}
              {totals.hasVat && <div><dt>KDV %{offer.vatRate}</dt><dd dir="ltr">{money(totals.vat)}</dd></div>}
              <div className="grand"><dt>Genel toplam</dt><dd dir="ltr">{money(totals.total)}</dd></div>
            </dl>
          </div>

          {/* Terms */}
          <div className="adCard">
            <div className="adCardHead"><h2>Ticari koşullar</h2><span className="adHint">Boş bırakılanlar belgede görünmez</span></div>
            <div className="adOfferRow">
              <label className="cmsField">
                <span>Teslim şekli (Incoterm)</span>
                <select value={offer.incoterm} onChange={(event) => update({ incoterm: event.target.value })}>
                  <option value="">—</option>
                  {INCOTERMS.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </label>
              <label className="cmsField adOfferWide">
                <span>Teslim yeri</span>
                <input value={offer.deliveryPlace} maxLength={160} placeholder="ör. Mersin fabrika / Mersin Limanı" onChange={(event) => update({ deliveryPlace: event.target.value })} />
              </label>
            </div>
            <label className="cmsField">
              <span>Teslim süresi</span>
              <input value={offer.deliveryTime} maxLength={160} placeholder="ör. Sipariş onayından sonra … iş günü" onChange={(event) => update({ deliveryTime: event.target.value })} />
            </label>
            <label className="cmsField">
              <span>Ödeme koşulları</span>
              <input value={offer.paymentTerms} maxLength={300} placeholder="ör. %… peşin, kalanı yüklemeden önce" onChange={(event) => update({ paymentTerms: event.target.value })} />
            </label>
            <label className="cmsField">
              <span>Notlar (belgede görünür)</span>
              <textarea rows={3} value={offer.notes} maxLength={2000} onChange={(event) => update({ notes: event.target.value })} />
            </label>
            <label className="cmsField">
              <span>Genel koşullar</span>
              <textarea rows={4} value={offer.terms} maxLength={3000} onChange={(event) => update({ terms: event.target.value })} />
              <small>Varsayılan metni ve banka bilgilerini <Link to="/admin/settings">Site ayarları → Teklif belgesi</Link> bölümünden girin.</small>
            </label>
          </div>
        </div>

        <aside className="adOfferPreview">
          <div className="adOfferActions">
            <button type="button" className="cmsButton" onClick={save} disabled={Boolean(busy)}>
              <Save aria-hidden="true" />
              {busy === 'save' ? 'Kaydediliyor…' : dirty || !quote.offer ? 'Kaydet' : 'Kaydedildi'}
            </button>
            <button type="button" className="cmsButton" onClick={download} disabled={Boolean(busy)}>
              <Download aria-hidden="true" />
              {busy === 'pdf' ? 'Hazırlanıyor…' : 'PDF indir'}
            </button>
            <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => setConfirmSend(true)} disabled={Boolean(busy)}>
              <Mail aria-hidden="true" />
              {busy === 'send' ? 'Gönderiliyor…' : 'Müşteriye gönder'}
            </button>
          </div>

          {missingPrice && <p className="adOfferWarn">Fiyatı girilmemiş satır var (0 olarak görünür).</p>}

          {confirmSend && (
            <div className="adOfferConfirm" role="alertdialog" aria-label="Teklifi gönder">
              <p>
                <strong>{number}</strong> PDF olarak <strong>{quote.email}</strong> adresine gönderilecek
                {dirty ? ' (önce kaydedilecek)' : ''}. Toplam: <strong dir="ltr">{money(totals.total)}</strong>
              </p>
              <div>
                <button type="button" className="cmsButton" onClick={() => setConfirmSend(false)}>Vazgeç</button>
                <button type="button" className="cmsButton cmsButtonPrimary" onClick={send}>Gönder</button>
              </div>
            </div>
          )}

          <div className="adOfferPaper" ref={paperRef} style={{ height: `${Math.ceil((docRef.current?.offsetHeight || 1123) * scale)}px` }}>
            <div className="adOfferScale" style={{ transform: `scale(${scale})` }} aria-hidden="true">
              <OfferDocument quote={quote} offer={offer} company={company} />
            </div>
          </div>

          {/* Full-size copy drawn into the PDF (off screen) */}
          <div className="adOfferCapture" aria-hidden="true">
            <OfferDocument ref={docRef} quote={quote} offer={offer} company={company} />
          </div>
        </aside>
      </div>
    </section>
  );
}
