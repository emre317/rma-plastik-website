import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import tr from '../../i18n/locales/tr';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import {
  createProduct,
  getProduct,
  updateProduct,
  uploadProductImage,
} from '../../services/adminContentApi';

const LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const TEXT_FIELDS = [
  { key: 'name', label: 'Ürün adı', required: true },
  { key: 'categoryLabel', label: 'Kategori adı (sayfada görünen)' },
  { key: 'capacity', label: 'Kapasite', placeholder: 'ör. 500 — 42.000 L' },
  { key: 'material', label: 'Malzeme' },
  { key: 'application', label: 'Uygulama' },
  { key: 'technology', label: 'Üretim teknolojisi' },
  { key: 'description', label: 'Açıklama (SEO açıklaması olarak da kullanılır)', multiline: true },
];

const CATEGORIES = Object.entries(tr.productsPage.filters).filter(([key]) => key !== 'all');

const emptyText = () => Object.fromEntries(TEXT_FIELDS.map(({ key }) => [key, '']));

const emptyProduct = {
  slug: '',
  category: CATEGORIES[0][0],
  quoteName: '',
  order: 100,
  featured: false,
  published: true,
  image: '',
  i18n: { tr: emptyText(), en: emptyText(), ar: emptyText() },
  commerce: { sku: '', price: '', currency: 'TRY', stock: '', purchasable: false },
};

function slugify(value) {
  return value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export default function AdminProductEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const call = useAdminApi();

  usePageTitle(isNew ? 'Yeni ürün' : 'Ürünü düzenle');

  const [form, setForm] = useState(emptyProduct);
  const [originalSlug, setOriginalSlug] = useState('');
  const [lang, setLang] = useState('tr');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isNew) {
      return;
    }

    (async () => {
      try {
        const { data } = await call(getProduct, id);

        setForm({
          ...emptyProduct,
          ...data,
          i18n: Object.fromEntries(LANGUAGES.map(({ code }) => [code, { ...emptyText(), ...data.i18n?.[code] }])),
          commerce: {
            ...emptyProduct.commerce,
            ...data.commerce,
            price: data.commerce?.price ?? '',
            stock: data.commerce?.stock ?? '',
          },
        });
        setOriginalSlug(data.slug);
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [call, id, isNew]);

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const setText = (field, value) =>
    setForm((current) => ({
      ...current,
      i18n: { ...current.i18n, [lang]: { ...current.i18n[lang], [field]: value } },
    }));

  const setCommerce = (field, value) =>
    setForm((current) => ({ ...current, commerce: { ...current.commerce, [field]: value } }));

  async function handleImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setUploading(true);
      const { data } = await call(uploadProductImage, file);
      set('image', data.url);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);

    const payload = {
      ...form,
      slug: form.slug || slugify(form.i18n.en.name || form.i18n.tr.name),
      quoteName: form.quoteName || form.i18n.en.name || form.i18n.tr.name,
    };

    try {
      setSaving(true);

      if (isNew) {
        const { data } = await call(createProduct, payload);
        navigate(`/admin/products/${data._id}`, { replace: true });
      } else {
        const { data } = await call(updateProduct, id, payload);
        setForm((current) => ({ ...current, slug: data.slug, quoteName: data.quoteName }));
        setOriginalSlug(data.slug);
      }

      setMessage({ type: 'success', text: 'Kaydedildi. Sitede görünmesi için “Yayınla”ya basın.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="adminContent"><div className="adminLoading">Yükleniyor…</div></section>;
  }

  const activeLanguage = LANGUAGES.find((item) => item.code === lang);

  return (
    <section className="adminContent">

      <div className="adminPageHeader">
        <div>
          <Link to="/admin/products" className="adminBack">← Ürünler</Link>
          <h1>{isNew ? 'Yeni ürün' : form.i18n.tr.name || 'Ürünü düzenle'}</h1>
        </div>
      </div>

      <form className="cmsForm" onSubmit={handleSubmit}>

        {message && (
          <div className={`cmsMessage ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
            {message.text}
          </div>
        )}

        <div className="cmsGrid">

          {/* Texts per language */}
          <div className="cmsCard cmsCardWide">
            <div className="cmsTabs" role="tablist">
              {LANGUAGES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  role="tab"
                  aria-selected={lang === item.code}
                  className={lang === item.code ? 'active' : ''}
                  onClick={() => setLang(item.code)}
                >
                  {item.label}
                  {!form.i18n[item.code].name && <span className="cmsDot" title="Ürün adı boş" />}
                </button>
              ))}
            </div>

            <p className="cmsHint">
              Boş bırakılan İngilizce/Arapça alanlarda Türkçe metin gösterilir.
            </p>

            {TEXT_FIELDS.map((field) => (
              <label key={field.key} className="cmsField">
                <span>{field.label}{field.required && lang === 'tr' ? ' *' : ''}</span>
                {field.multiline ? (
                  <textarea
                    rows={5}
                    dir={activeLanguage.dir}
                    value={form.i18n[lang][field.key]}
                    onChange={(event) => setText(field.key, event.target.value)}
                    required={field.required && lang === 'tr'}
                  />
                ) : (
                  <input
                    dir={activeLanguage.dir}
                    value={form.i18n[lang][field.key]}
                    placeholder={field.placeholder}
                    onChange={(event) => setText(field.key, event.target.value)}
                    required={field.required && lang === 'tr'}
                  />
                )}
              </label>
            ))}
          </div>

          <div className="cmsColumn">

            {/* Publishing & structure */}
            <div className="cmsCard">
              <h2>Genel</h2>

              <label className="cmsCheck">
                <input type="checkbox" checked={form.published} onChange={(event) => set('published', event.target.checked)} />
                <span>Sitede yayında</span>
              </label>

              <label className="cmsCheck">
                <input type="checkbox" checked={form.featured} onChange={(event) => set('featured', event.target.checked)} />
                <span>Öne çıkan ürün</span>
              </label>

              <label className="cmsField">
                <span>Kategori</span>
                <select value={form.category} onChange={(event) => set('category', event.target.value)}>
                  {CATEGORIES.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="cmsField">
                <span>Sıra (küçük olan önce)</span>
                <input type="number" value={form.order} onChange={(event) => set('order', event.target.value)} />
              </label>

              <label className="cmsField">
                <span>Sayfa adresi (slug)</span>
                <input
                  value={form.slug}
                  placeholder="otomatik oluşturulur"
                  onChange={(event) => set('slug', slugify(event.target.value))}
                />
                <small>/tr/products/{form.slug || '…'}</small>
                {originalSlug && form.slug !== originalSlug && (
                  <small className="cmsWarn">Adres değişirse eski bağlantılar ve Google’daki kayıt çalışmaz.</small>
                )}
              </label>

              <label className="cmsField">
                <span>Teklif formundaki ad (İngilizce)</span>
                <input value={form.quoteName} placeholder="otomatik: İngilizce ürün adı" onChange={(event) => set('quoteName', event.target.value)} />
              </label>
            </div>

            {/* Image */}
            <div className="cmsCard">
              <h2>Görsel</h2>

              <div className="cmsImage">
                {form.image ? <img src={form.image} alt="" /> : <span>Görsel yok – sitede çizim gösterilir</span>}
              </div>

              <div className="cmsRowActions">
                <label className="cmsButton">
                  {uploading ? 'Yükleniyor…' : form.image ? 'Değiştir' : 'Görsel yükle'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleImage} disabled={uploading} />
                </label>
                {form.image && (
                  <button type="button" className="cmsButton cmsButtonDanger" onClick={() => set('image', '')}>Kaldır</button>
                )}
              </div>

              <small className="cmsMuted">JPG, PNG veya WEBP, en fazla 5 MB. Şeffaf arka planlı ürün fotoğrafı en iyi sonucu verir.</small>
            </div>

            {/* Commerce (hidden on the site) */}
            <div className="cmsCard">
              <h2>Ticari bilgiler</h2>
              <p className="cmsHint">Bu alanlar şimdilik sitede <strong>gösterilmez</strong>; ileride e-ticaret açıldığında kullanılır.</p>

              <label className="cmsField">
                <span>Stok kodu (SKU)</span>
                <input value={form.commerce.sku} onChange={(event) => setCommerce('sku', event.target.value)} />
              </label>

              <div className="cmsInline">
                <label className="cmsField">
                  <span>Fiyat</span>
                  <input type="number" min="0" step="0.01" value={form.commerce.price} onChange={(event) => setCommerce('price', event.target.value)} />
                </label>

                <label className="cmsField">
                  <span>Para birimi</span>
                  <select value={form.commerce.currency} onChange={(event) => setCommerce('currency', event.target.value)}>
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>
              </div>

              <label className="cmsField">
                <span>Stok adedi</span>
                <input type="number" min="0" value={form.commerce.stock} onChange={(event) => setCommerce('stock', event.target.value)} />
              </label>

              <label className="cmsCheck">
                <input type="checkbox" checked={form.commerce.purchasable} onChange={(event) => setCommerce('purchasable', event.target.checked)} />
                <span>Online satışa uygun</span>
              </label>
            </div>

          </div>
        </div>

        <div className="cmsSaveBar">
          <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>

      </form>
    </section>
  );
}
