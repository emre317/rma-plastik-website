import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus } from 'lucide-react';

import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import {
  createGalleryPhoto, deleteGalleryPhoto, listGallery, updateGalleryPhoto, uploadGalleryImage,
} from '../../services/adminContentApi';
import { useConfirm } from '../../components/ui/ConfirmDialog';

const LANGS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const emptyTexts = () => Object.fromEntries(LANGS.map(({ code }) => [code, { caption: '', location: '' }]));

/* Field photos on the Özel Üretim page (Saha fotoğrafları) */
export default function AdminGallery() {
  usePageTitle('Saha Fotoğrafları');

  const call = useAdminApi();
  const confirm = useConfirm();
  const fileRef = useRef(null);
  const replaceRef = useRef(null);

  const [photos, setPhotos] = useState([]);
  const [form, setForm] = useState(null);
  const [lang, setLang] = useState('tr');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState(null);

  async function load() {
    try {
      const { data } = await call(listGallery);
      setPhotos(data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Several files at once: each becomes a photo at the end of the list
  async function uploadNew(event) {
    const files = [...(event.target.files || [])].slice(0, 20);
    event.target.value = '';
    if (!files.length) return;

    setMessage(null);
    let order = (photos[photos.length - 1]?.order || 0) + 10;
    let added = 0;

    try {
      for (const [index, file] of files.entries()) {
        setUploading(`${index + 1} / ${files.length} yükleniyor…`);
        const { data } = await call(uploadGalleryImage, file);
        await call(createGalleryPhoto, { image: data.url, published: true, order, i18n: emptyTexts() });
        order += 10;
        added += 1;
      }
      setMessage({ type: 'success', text: `${added} fotoğraf eklendi. Açıklama ekleyip “Yayınla”ya basın.` });
    } catch (err) {
      setMessage({ type: 'error', text: `${added ? `${added} fotoğraf eklendi; ` : ''}${err.message}` });
    } finally {
      setUploading('');
      await load();
    }
  }

  async function replaceImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setUploading('Yükleniyor…');
      const { data } = await call(uploadGalleryImage, file);
      setForm((current) => ({ ...current, image: data.url }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading('');
    }
  }

  function edit(photo) {
    setMessage(null);
    setLang('tr');
    setForm({
      _id: photo._id,
      image: photo.image,
      published: photo.published,
      order: photo.order,
      i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { caption: '', location: '', ...photo.i18n?.[code] }])),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const setText = (field, value) =>
    setForm((current) => ({ ...current, i18n: { ...current.i18n, [lang]: { ...current.i18n[lang], [field]: value } } }));

  async function save(event) {
    event.preventDefault();

    try {
      setSaving(true);
      await call(updateGalleryPhoto, form._id, form);
      setForm(null);
      setMessage({ type: 'success', text: 'Fotoğraf kaydedildi. Sitede görünmesi için “Yayınla”ya basın.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(photo) {
    if (!(await confirm({ title: 'Fotoğraf silinsin mi?', message: 'Fotoğraf galeriden kalıcı olarak kaldırılır.', confirmLabel: 'Fotoğrafı Sil', tone: 'danger' }))) return;

    try {
      await call(deleteGalleryPhoto, photo._id);
      setPhotos((list) => list.filter((item) => item._id !== photo._id));
      if (form?._id === photo._id) setForm(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;

    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    const changed = next
      .map((photo, position) => ({ ...photo, order: (position + 1) * 10 }))
      .filter((photo) => photo.order !== photos.find((item) => item._id === photo._id).order);

    try {
      setSaving(true);
      await Promise.all(changed.map((photo) => call(updateGalleryPhoto, photo._id, photo)));
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const activeLanguage = LANGS.find((item) => item.code === lang);

  return (
    <section className="adminContent">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">İçerik</span>
          <h1>Saha Fotoğrafları</h1>
          <p>
            Sahada kurulu tank ve depoların gerçek fotoğrafları. Özel Üretim sayfasında referans projelerin altında “Kullanımdaki ürünlerimiz”
            bölümünde gösterilir; fotoğraf yokken bölüm görünmez.
          </p>
        </div>
        <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => fileRef.current?.click()} disabled={Boolean(uploading)}>
          <ImagePlus aria-hidden="true" />
          {uploading || 'Fotoğraf yükle'}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={uploadNew} />
      </header>

      {message && <div className={`cmsMessage ${message.type}`}>{message.text}</div>}

      {form && (
        <form className="cmsCard cmsVideoForm" onSubmit={save}>
          <div className="cmsVideoFormGrid">
            <div className="cmsColumn">
              <div className="cmsTabs" role="tablist">
                {LANGS.map((item) => (
                  <button key={item.code} type="button" role="tab" aria-selected={lang === item.code} className={lang === item.code ? 'active' : ''} onClick={() => setLang(item.code)}>
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="cmsField">
                <span>Açıklama{lang === 'tr' ? '' : ' (boşsa Türkçe)'}</span>
                <input dir={activeLanguage.dir} value={form.i18n[lang].caption} maxLength={200} placeholder="ör. 10 ton su deposu – sulama tesisi" onChange={(event) => setText('caption', event.target.value)} />
              </label>

              <label className="cmsField">
                <span>Yer</span>
                <input dir={activeLanguage.dir} value={form.i18n[lang].location} maxLength={120} placeholder="ör. Adana, Türkiye" onChange={(event) => setText('location', event.target.value)} />
                <small>Müşteri adı veya yeri yazmadan önce iznini aldığınızdan emin olun.</small>
              </label>

              <div className="cmsInline cmsInlineEven">
                <label className="cmsField">
                  <span>Sıra</span>
                  <input type="number" value={form.order} onChange={(event) => setForm({ ...form, order: event.target.value })} />
                </label>

                <label className="cmsCheck">
                  <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
                  <span>Sitede Göster</span>
                </label>
              </div>
            </div>

            <div className="cmsColumn">
              <div className="cmsImage adGalleryPreview">
                <img src={form.image} alt="" />
              </div>
              <input ref={replaceRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={replaceImage} />
              <div className="cmsRowActions">
                <button type="button" className="cmsButton" onClick={() => replaceRef.current?.click()} disabled={Boolean(uploading)}>
                  {uploading || 'Fotoğrafı değiştir'}
                </button>
              </div>
            </div>
          </div>

          <div className="cmsRowActions">
            <button type="button" className="cmsButton" onClick={() => setForm(null)}>Vazgeç</button>
            <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>
      ) : photos.length === 0 ? (
        <div className="cmsEmpty">
          <p>Henüz fotoğraf yok. Yatay, net ve sahadaki kullanımı gösteren fotoğraflar seçin (JPG, PNG veya WEBP, her biri en fazla 5 MB). Birden fazla dosyayı aynı anda seçebilirsiniz.</p>
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => fileRef.current?.click()} disabled={Boolean(uploading)}>
            {uploading || 'Fotoğraf yükle'}
          </button>
        </div>
      ) : (
        <ul className="adGalleryGrid">
          {photos.map((photo, index) => (
            <li key={photo._id} className={photo.published ? '' : 'hidden'}>
              <span className="adGalleryThumb"><img src={photo.image} alt="" loading="lazy" /></span>
              <span className="adGalleryText">
                <strong>{photo.i18n?.tr?.caption || 'Açıklama yok'}</strong>
                <small>{[photo.i18n?.tr?.location, photo.published ? 'Sitede' : 'Gizli'].filter(Boolean).join(' · ')}</small>
              </span>
              <span className="adGalleryActions">
                <button type="button" className="adIconButton" onClick={() => move(index, -1)} disabled={saving || index === 0} aria-label="Öne al"><ArrowUp aria-hidden="true" /></button>
                <button type="button" className="adIconButton" onClick={() => move(index, 1)} disabled={saving || index === photos.length - 1} aria-label="Geriye al"><ArrowDown aria-hidden="true" /></button>
                <button type="button" className="cmsButton" onClick={() => edit(photo)}>Düzenle</button>
                <button type="button" className="cmsButton cmsButtonDanger" onClick={() => remove(photo)}>Sil</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
