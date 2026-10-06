import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import tr from '../../i18n/locales/tr';
import portfolio, { LEGACY_PRODUCT_GROUPS } from '../../data/productPortfolio';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { renderMarkdown } from '../../components/content/markdown';
import {
  createPost,
  getPost,
  updatePost,
  uploadPostImage,
} from '../../services/adminContentApi';

const LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const emptyText = () => ({ title: '', excerpt: '', body: '', seoTitle: '', seoDescription: '' });

const emptyPost = {
  slug: '',
  status: 'draft',
  publishedAt: '',
  coverImage: '',
  youtubeId: '',
  relatedProducts: [],
  i18n: { tr: emptyText(), en: emptyText(), ar: emptyText() },
};

const TOOLBAR = [
  { label: 'H2', title: 'Ara başlık', before: '\n## ', after: '\n', placeholder: 'Ara başlık' },
  { label: 'H3', title: 'Alt başlık', before: '\n### ', after: '\n', placeholder: 'Alt başlık' },
  { label: 'B', title: 'Kalın', before: '**', after: '**', placeholder: 'kalın metin' },
  { label: '•', title: 'Liste', before: '\n- ', after: '', placeholder: 'madde' },
  { label: '1.', title: 'Numaralı liste', before: '\n1. ', after: '', placeholder: 'madde' },
  { label: '❝', title: 'Alıntı / not', before: '\n> ', after: '\n', placeholder: 'not' },
  { label: 'Link', title: 'Bağlantı', before: '[', after: '](https://)', placeholder: 'bağlantı metni' },
];

function slugify(value) {
  return value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm"
function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 16);
}

export default function AdminPostEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const call = useAdminApi();
  const bodyRef = useRef(null);

  usePageTitle(isNew ? 'Yeni yazı' : 'Yazıyı düzenle');

  const [form, setForm] = useState(emptyPost);
  const [lang, setLang] = useState('tr');
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [originalSlug, setOriginalSlug] = useState('');

  useEffect(() => {
    if (isNew) return;

    (async () => {
      try {
        const { data } = await call(getPost, id);
        setForm({
          ...emptyPost,
          ...data,
          publishedAt: toLocalInput(data.publishedAt),
          // Older posts stored generic product slugs: map them to product groups
          relatedProducts: [...new Set((data.relatedProducts || []).map((item) => LEGACY_PRODUCT_GROUPS[item] || item))],
          i18n: Object.fromEntries(LANGUAGES.map(({ code }) => [code, { ...emptyText(), ...data.i18n?.[code] }])),
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
    setForm((current) => ({ ...current, i18n: { ...current.i18n, [lang]: { ...current.i18n[lang], [field]: value } } }));

  const text = form.i18n[lang];
  const activeLanguage = LANGUAGES.find((item) => item.code === lang);

  function applyTool(tool) {
    const area = bodyRef.current;
    if (!area) return;

    const { selectionStart: start, selectionEnd: end, value } = area;
    const selected = value.slice(start, end) || tool.placeholder;
    const next = value.slice(0, start) + tool.before + selected + tool.after + value.slice(end);

    setText('body', next);

    requestAnimationFrame(() => {
      area.focus();
      const cursor = start + tool.before.length;
      area.setSelectionRange(cursor, cursor + selected.length);
    });
  }

  async function upload(event, target) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setUploading(true);
      const { data } = await call(uploadPostImage, file);

      if (target === 'cover') {
        set('coverImage', data.url);
      } else {
        setText('body', `${text.body}\n\n![${file.name.replace(/\.[^.]+$/, '')}](${data.url})\n`);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  }

  function toggleProduct(slug) {
    set(
      'relatedProducts',
      form.relatedProducts.includes(slug)
        ? form.relatedProducts.filter((item) => item !== slug)
        : [...form.relatedProducts, slug]
    );
  }

  async function save(status) {
    setMessage(null);

    const payload = {
      ...form,
      status: status || form.status,
      slug: form.slug || slugify(form.i18n.tr.title),
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
    };

    try {
      setSaving(true);

      if (isNew) {
        const { data } = await call(createPost, payload);
        navigate(`/admin/posts/${data._id}`, { replace: true });
      } else {
        const { data } = await call(updatePost, id, payload);
        setForm((current) => ({ ...current, slug: data.slug, status: data.status, publishedAt: toLocalInput(data.publishedAt) }));
        setOriginalSlug(data.slug);
      }

      setMessage({
        type: 'success',
        text:
          payload.status === 'published'
            ? 'Kaydedildi. Sitede görünmesi için “Yayınla”ya basın.'
            : 'Taslak olarak kaydedildi (sitede görünmez).',
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="adminContent"><div className="adminLoading">Yükleniyor…</div></section>;
  }

  const seoTitle = text.seoTitle || text.title;
  const seoDescription = text.seoDescription || text.excerpt;

  return (
    <section className="adminContent">
      <div className="adminPageHeader">
        <div>
          <Link to="/admin/posts" className="adminBack">← Blog yazıları</Link>
          <h1>{isNew ? 'Yeni yazı' : form.i18n.tr.title || 'Yazıyı düzenle'}</h1>
        </div>
      </div>

      <form className="cmsForm" onSubmit={(event) => { event.preventDefault(); save(); }}>
        {message && <div className={`cmsMessage ${message.type}`}>{message.text}</div>}

        <div className="cmsGrid">
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
                  {form.i18n[item.code].title && form.i18n[item.code].body ? null : <span className="cmsDot" title="Bu dilde yayınlanmaz" />}
                </button>
              ))}
            </div>

            <p className="cmsHint">
              {lang === 'tr'
                ? 'Türkçe başlık zorunludur.'
                : 'Bu dilde başlık ve metin doldurulursa yazı bu dilde de yayınlanır; boşsa bu dilde sayfa oluşturulmaz.'}
            </p>

            <label className="cmsField">
              <span>Başlık{lang === 'tr' ? ' *' : ''}</span>
              <input dir={activeLanguage.dir} value={text.title} onChange={(event) => setText('title', event.target.value)} required={lang === 'tr'} maxLength={160} />
            </label>

            <label className="cmsField">
              <span>Özet (listede ve yazının başında görünür)</span>
              <textarea rows={2} dir={activeLanguage.dir} value={text.excerpt} onChange={(event) => setText('excerpt', event.target.value)} maxLength={400} />
            </label>

            <div className="cmsField">
              <span>Metin</span>

              <div className="cmsEditorBar">
                {TOOLBAR.map((tool) => (
                  <button key={tool.label} type="button" title={tool.title} onClick={() => applyTool(tool)} disabled={preview}>
                    {tool.label}
                  </button>
                ))}

                <label className="cmsEditorUpload" title="Metne görsel ekle">
                  {uploading ? '…' : 'Görsel'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => upload(event, 'body')} disabled={uploading || preview} />
                </label>

                <button type="button" className={`cmsEditorToggle ${preview ? 'active' : ''}`} onClick={() => setPreview((value) => !value)}>
                  {preview ? 'Düzenle' : 'Önizleme'}
                </button>
              </div>

              {preview ? (
                <div className="cmsPreview prose" dir={activeLanguage.dir} dangerouslySetInnerHTML={{ __html: renderMarkdown(text.body) }} />
              ) : (
                <textarea
                  ref={bodyRef}
                  className="cmsBody"
                  rows={22}
                  dir={activeLanguage.dir}
                  value={text.body}
                  onChange={(event) => setText('body', event.target.value)}
                  placeholder={'## Ara başlık\n\nParagraf metni…\n\n- madde\n- madde'}
                />
              )}

              <small>Biçim: ## ara başlık, **kalın**, - liste, [bağlantı](https://…). Görsel ve bağlantılar için araç çubuğunu kullanın.</small>
            </div>

            <details className="cmsSeo">
              <summary>Google görünümü (SEO)</summary>

              <div className="cmsSerp">
                <span className="cmsSerpUrl">rmaplastik.com › {lang} › blog › {form.slug || slugify(form.i18n.tr.title) || '…'}</span>
                <span className="cmsSerpTitle">{(seoTitle || 'Başlık').slice(0, 60)} | RMA Plastik</span>
                <span className="cmsSerpText">{(seoDescription || 'Açıklama…').slice(0, 160)}</span>
              </div>

              <label className="cmsField">
                <span>SEO başlığı (boşsa başlık kullanılır) – {seoTitle.length}/60</span>
                <input dir={activeLanguage.dir} value={text.seoTitle} onChange={(event) => setText('seoTitle', event.target.value)} maxLength={70} />
              </label>

              <label className="cmsField">
                <span>SEO açıklaması (boşsa özet kullanılır) – {seoDescription.length}/160</span>
                <textarea rows={2} dir={activeLanguage.dir} value={text.seoDescription} onChange={(event) => setText('seoDescription', event.target.value)} maxLength={170} />
              </label>
            </details>
          </div>

          <div className="cmsColumn">
            <div className="cmsCard">
              <h2>Yayın</h2>

              <span className={`cmsStatus ${form.status === 'published' ? 'on' : 'off'} cmsStatusStatic`}>
                {form.status === 'published' ? 'Yayında' : 'Taslak'}
              </span>

              <label className="cmsField">
                <span>Yayın tarihi (ileri tarih = zamanlanmış)</span>
                <input type="datetime-local" value={form.publishedAt} onChange={(event) => set('publishedAt', event.target.value)} />
                <small>Zamanlanan yazı, o tarihten sonraki ilk “Yayınla”da siteye çıkar.</small>
              </label>

              <label className="cmsField">
                <span>Sayfa adresi (slug)</span>
                <input value={form.slug} placeholder="başlıktan otomatik" onChange={(event) => set('slug', slugify(event.target.value))} />
                <small>/{lang}/blog/{form.slug || slugify(form.i18n.tr.title) || '…'}</small>
                {originalSlug && form.slug !== originalSlug && (
                  <small className="cmsWarn">Yayındaki yazının adresi değişirse eski bağlantılar çalışmaz.</small>
                )}
              </label>
            </div>

            <div className="cmsCard">
              <h2>Kapak görseli</h2>
              <div className="cmsImage cmsImageCover">
                {form.coverImage ? <img src={form.coverImage} alt="" /> : <span>Kapak yok</span>}
              </div>
              <div className="cmsRowActions">
                <label className="cmsButton">
                  {uploading ? 'Yükleniyor…' : form.coverImage ? 'Değiştir' : 'Kapak yükle'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => upload(event, 'cover')} disabled={uploading} />
                </label>
                {form.coverImage && <button type="button" className="cmsButton cmsButtonDanger" onClick={() => set('coverImage', '')}>Kaldır</button>}
              </div>
              <small className="cmsMuted">Önerilen: yatay, en az 1600×900 piksel. Paylaşım görseli olarak da kullanılır.</small>
            </div>

            <div className="cmsCard">
              <h2>YouTube videosu</h2>
              <label className="cmsField">
                <span>Video bağlantısı (isteğe bağlı)</span>
                <input value={form.youtubeId} placeholder="https://youtu.be/…" onChange={(event) => set('youtubeId', event.target.value)} />
                <small>Yazının sonunda gösterilir.</small>
              </label>
            </div>

            <div className="cmsCard">
              <h2>İlgili ürün grupları</h2>
              <p className="cmsHint">Yazının sonunda görselli bağlantı olarak gösterilir; ilk seçilen grup teklif formunda konu olarak gelir.</p>
              {portfolio.map((group) => (
                <label key={group.id} className="cmsCheck">
                  <input type="checkbox" checked={form.relatedProducts.includes(group.id)} onChange={() => toggleProduct(group.id)} />
                  <span>{tr.productExplorer.items[group.id]?.title || group.id}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="cmsSaveBar visible">
          <button type="button" className="cmsButton" disabled={saving} onClick={() => save('draft')}>
            Taslak olarak kaydet
          </button>
          <button type="button" className="cmsButton cmsButtonPrimary" disabled={saving} onClick={() => save('published')}>
            {saving ? 'Kaydediliyor…' : form.status === 'published' ? 'Kaydet' : 'Yayına al'}
          </button>
        </div>
      </form>
    </section>
  );
}
