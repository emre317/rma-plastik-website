import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, BadgeCheck, CalendarClock, FileText, Image as ImageIcon, Plus, Upload,
} from 'lucide-react';

import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import builtInCertificates, { CERTIFICATE_CATEGORIES } from '../../data/certificates.builtin';
import {
  createCertificate, deleteCertificate, importCertificates, listCertificates, updateCertificate, uploadCertificateFile, uploadCertificateImage,
} from '../../services/adminContentApi';
import pdfPreview from '../../services/pdfPreview';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { CertificateSeal } from '../../components/certificates/CertificateParts';

const LANGS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const CATEGORY_LABELS = {
  quality: 'Kalite', environment: 'Çevre', safety: 'İş Sağlığı ve Güvenliği', customer: 'Müşteri Memnuniyeti', product: 'Ürün', registration: 'Resmî kayıt / izin', other: 'Diğer',
};

const WARN_DAYS = 60;
// Same matching as the server (certificateController.certificateKey)
const certificateKey = (code) => String(code || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
const dayValue = (value) => (value ? String(value).slice(0, 10) : '');
const daysLeft = (value) => (value ? Math.ceil((new Date(`${dayValue(value)}T23:59:59+03:00`).getTime() - Date.now()) / 86400000) : null);
const formatDay = (value) => (value ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(`${dayValue(value)}T12:00:00+03:00`)) : '—');

function expiry(certificate) {
  const left = daysLeft(certificate.validUntil);
  if (left === null) return { tone: 'green', text: 'Süresiz (bitiş tarihi yok)' };
  if (left < 0) return { tone: 'red', text: `Süresi doldu (${formatDay(certificate.validUntil)}) · sitede gösterilmez` };
  if (left <= WARN_DAYS) return { tone: 'amber', text: `${left} gün sonra doluyor · yenisini yükleyin` };
  return { tone: 'green', text: `${formatDay(certificate.validUntil)} tarihine kadar geçerli` };
}

const empty = (order = 0) => ({
  _id: null,
  code: '',
  category: 'quality',
  number: '',
  holder: 'RMA Yatırım Makina İnş. San. ve Tic. Ltd. Şti.',
  issuer: '',
  accreditation: '',
  issuedAt: '',
  validUntil: '',
  file: '',
  image: '',
  verifyUrl: '',
  published: true,
  order,
  i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { title: '', scope: '' }])),
});

/* Kalite ve Sertifikalar: certificates shown on the site (page, home and company) */
export default function AdminCertificates() {
  usePageTitle('Sertifikalar');

  const call = useAdminApi();
  const confirm = useConfirm();
  const pdfRef = useRef(null);
  const imageRef = useRef(null);

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const [lang, setLang] = useState('tr');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState(null);

  async function load() {
    try {
      const { data } = await call(listCertificates);
      setItems(data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function edit(item) {
    setMessage(null);
    setLang('tr');
    setForm(
      item
        ? {
            ...empty(item.order),
            ...item,
            issuedAt: dayValue(item.issuedAt),
            validUntil: dayValue(item.validUntil),
            i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { title: '', scope: '', ...item.i18n?.[code] }])),
          }
        : empty(((items[items.length - 1]?.order) || 0) + 10)
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const setText = (field, value) => setForm((current) => ({ ...current, i18n: { ...current.i18n, [lang]: { ...current.i18n[lang], [field]: value } } }));

  async function uploadPdf(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading('pdf');
    setMessage(null);
    try {
      const { data } = await call(uploadCertificateFile, file);
      setForm((current) => ({ ...current, file: data.url }));

      // The certificate picture for the site, from the first page of the PDF
      try {
        setUploading('preview');
        const preview = await pdfPreview(file);
        const image = await call(uploadCertificateImage, preview);
        setForm((current) => ({ ...current, image: image.data.url }));
      } catch {
        setMessage({ type: 'warning', text: 'PDF yüklendi ama önizleme görseli oluşturulamadı. Belgenin görselini (JPG/PNG) ayrıca yükleyebilirsiniz.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading('');
    }
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading('image');
    try {
      const { data } = await call(uploadCertificateImage, file);
      setForm((current) => ({ ...current, image: data.url }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading('');
    }
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (form._id) await call(updateCertificate, form._id, form);
      else await call(createCertificate, form);
      setForm(null);
      setMessage({ type: 'success', text: 'Sertifika kaydedildi. Sitede görünmesi için “Yayınla”ya basın.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!(await confirm({ title: 'Sertifika silinsin mi?', message: `${item.code} sitedeki sertifikalardan kaldırılır.`, confirmLabel: 'Sertifikayı Sil', tone: 'danger' }))) return;
    try {
      await call(deleteCertificate, item._id);
      setItems((list) => list.filter((entry) => entry._id !== item._id));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function importDefaults() {
    setSaving(true);
    try {
      const response = await call(importCertificates);
      const added = response.added || [];
      setMessage({ type: 'success', text: `${added.length} belge eklendi: ${added.join(', ')}. Sitede görünmesi için “Yayınla”ya basın.` });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const activeLanguage = LANGS.find((item) => item.code === lang);
  // Built-in certificates the panel does not have yet (the import button adds only these)
  const have = new Set(items.map((item) => certificateKey(item.code)));
  const missing = builtInCertificates.filter((item) => !have.has(certificateKey(item.code)));
  const warnings = items.filter((item) => item.published && ['amber', 'red'].includes(expiry(item).tone));

  return (
    <section className="adminContent adCerts">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">İçerik</span>
          <h1>Sertifikalar</h1>
          <p>Kalite ve Sertifikalar sayfasında, ana sayfada ve Kurumsal sayfada gösterilen belgeler. PDF yükleyin; sitedeki belge görseli PDF’in ilk sayfasından otomatik oluşturulur. Süresi dolan belge sitede kendiliğinden gizlenir.</p>
        </div>
        {!form && (
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => edit(null)}><Plus aria-hidden="true" />Yeni sertifika</button>
        )}
      </header>

      {message && <div className={`cmsMessage ${message.type}`}>{message.text}</div>}

      {warnings.length > 0 && !form && (
        <div className="adNotice warning">
          <AlertTriangle aria-hidden="true" />
          <span>{warnings.map((item) => `${item.code}: ${expiry(item).text}`).join(' · ')}</span>
        </div>
      )}

      {form && (
        <form className="cmsCard adCertForm" onSubmit={save}>
          <div className="adCertFormGrid">
            <div className="cmsColumn">
              <div className="cmsInline cmsInlineEven">
                <label className="cmsField">
                  <span>Standart / belge adı *</span>
                  <input value={form.code} onChange={set('code')} maxLength={60} placeholder="ör. ISO 9001:2015" required />
                </label>
                <label className="cmsField">
                  <span>Kategori</span>
                  <select value={form.category} onChange={set('category')}>
                    {CERTIFICATE_CATEGORIES.map((key) => <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>)}
                  </select>
                </label>
              </div>

              <div className="cmsTabs" role="tablist">
                {LANGS.map((item) => (
                  <button key={item.code} type="button" role="tab" aria-selected={lang === item.code} className={lang === item.code ? 'active' : ''} onClick={() => setLang(item.code)}>{item.label}</button>
                ))}
              </div>
              <label className="cmsField">
                <span>Başlık{lang === 'tr' ? ' *' : ' (boşsa Türkçeden otomatik çevrilir)'}</span>
                <input dir={activeLanguage.dir} value={form.i18n[lang].title} maxLength={160} placeholder="ör. Kalite Yönetim Sistemi" onChange={(event) => setText('title', event.target.value)} required={lang === 'tr'} />
              </label>
              <label className="cmsField">
                <span>Belgelendirme kapsamı</span>
                <textarea dir={activeLanguage.dir} value={form.i18n[lang].scope} maxLength={1200} rows={4} placeholder="Belgede yazan kapsam metni" onChange={(event) => setText('scope', event.target.value)} />
              </label>

              <div className="cmsInline cmsInlineEven">
                <label className="cmsField"><span>Belge numarası</span><input value={form.number} onChange={set('number')} maxLength={60} placeholder="ör. A1803532" /></label>
                <label className="cmsField"><span>Belgelendiren kuruluş</span><input value={form.issuer} onChange={set('issuer')} maxLength={120} placeholder="ör. BelCert Uluslararası Belgelendirme" /></label>
              </div>
              <div className="cmsInline cmsInlineEven">
                <label className="cmsField"><span>Akreditasyon</span><input value={form.accreditation} onChange={set('accreditation')} maxLength={120} placeholder="ör. ILAS (ILAS-MS-0089)" /></label>
                <label className="cmsField"><span>Doğrulama bağlantısı</span><input type="url" value={form.verifyUrl} onChange={set('verifyUrl')} maxLength={300} placeholder="https://…" /></label>
              </div>
              <div className="cmsInline cmsInlineEven">
                <label className="cmsField"><span>Yayın tarihi</span><input type="date" value={form.issuedAt} onChange={set('issuedAt')} /></label>
                <label className="cmsField">
                  <span>Geçerlilik tarihi</span>
                  <input type="date" value={form.validUntil} min={form.issuedAt || undefined} onChange={set('validUntil')} />
                  <small>Bu tarihten sonra belge sitede otomatik gizlenir (sonraki yayında).</small>
                </label>
              </div>
              <label className="cmsField"><span>Belge sahibi (ünvan)</span><input value={form.holder} onChange={set('holder')} maxLength={160} /></label>

              <div className="cmsInline cmsInlineEven">
                <label className="cmsField"><span>Sıra</span><input type="number" value={form.order} onChange={set('order')} /><small>Küçük sayı önce gösterilir.</small></label>
                <label className="cmsCheck"><input type="checkbox" checked={form.published} onChange={set('published')} /><span>Sitede göster</span></label>
              </div>
            </div>

            <div className="cmsColumn adCertMedia">
              <div className={`adCertPreview ${form.image ? '' : 'empty'}`}>
                {form.image ? <img src={form.image} alt="" /> : <CertificateSeal certificate={{ code: form.code || 'ISO', category: form.category }} size="lg" />}
                {uploading === 'preview' && <span className="adCertBusy">Önizleme oluşturuluyor…</span>}
              </div>

              <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={uploadPdf} />
              <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadImage} />

              <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => pdfRef.current?.click()} disabled={Boolean(uploading)}>
                <Upload aria-hidden="true" />
                {uploading === 'pdf' ? 'PDF yükleniyor…' : form.file ? 'PDF’i değiştir' : 'Sertifika PDF’i yükle'}
              </button>
              {form.file && (
                <a className="adCertFile" href={form.file} target="_blank" rel="noreferrer"><FileText aria-hidden="true" />PDF yüklü · aç</a>
              )}
              <button type="button" className="cmsButton" onClick={() => imageRef.current?.click()} disabled={Boolean(uploading)}>
                <ImageIcon aria-hidden="true" />
                {uploading === 'image' ? 'Yükleniyor…' : 'Görseli elle değiştir'}
              </button>
              <small className="cmsHint">PDF en fazla 15 MB. Sitedeki belge görseli PDF’in ilk sayfasından otomatik oluşturulur; isterseniz kendi görselinizi yükleyebilirsiniz.</small>
            </div>
          </div>

          <div className="cmsRowActions">
            <button type="button" className="cmsButton" onClick={() => setForm(null)}>Vazgeç</button>
            <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving || Boolean(uploading)}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </div>
        </form>
      )}

      {!loading && !form && items.length > 0 && missing.length > 0 && (
        <div className="adNotice adCertMissing">
          <Plus aria-hidden="true" />
          <span>
            <strong>Panelde olmayan {missing.length} hazır belge var:</strong> {missing.map((item) => item.code).join(', ')}.
            {' '}Eklenenler mevcut belgelerin sonuna gelir; paneldeki belgeler değişmez.
          </span>
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={importDefaults} disabled={saving}>
            {saving ? 'Ekleniyor…' : 'Eksik belgeleri ekle'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>
      ) : items.length === 0 ? (
        !form && (
          <div className="cmsEmpty">
            <p>Panelde henüz sertifika yok; sitede şu an hazır {builtInCertificates.length} sertifika ({builtInCertificates.map((item) => item.code).join(', ')}) gösteriliyor. Düzenleyebilmek için önce panele aktarın ya da yeni sertifika ekleyin.</p>
            <button type="button" className="cmsButton cmsButtonPrimary" onClick={importDefaults} disabled={saving}>Sitedeki sertifikaları içe aktar</button>
          </div>
        )
      ) : (
        <ul className="adCertGrid">
          {items.map((item) => {
            const status = expiry(item);
            return (
              <li key={item._id} className={`adCertCard cat-${item.category} ${item.published ? '' : 'hidden'}`}>
                <span className="adCertThumb">{item.image ? <img src={item.image} alt="" /> : <CertificateSeal certificate={item} size="sm" />}</span>
                <span className="adCertText">
                  <strong>{item.code}</strong>
                  <small>{item.i18n?.tr?.title}</small>
                  <span className={`adPill tone-${status.tone}`}>
                    {status.tone === 'green' ? <BadgeCheck aria-hidden="true" /> : <CalendarClock aria-hidden="true" />}
                    {status.text}
                  </span>
                  <em>{item.published ? 'Sitede' : 'Gizli'} · {item.file ? 'PDF var' : 'PDF yok'} · sıra {item.order}</em>
                </span>
                <span className="cmsRowActions">
                  <button type="button" className="cmsButton" onClick={() => edit(item)}>Düzenle</button>
                  <button type="button" className="cmsButton cmsButtonDanger" onClick={() => remove(item)}>Sil</button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
