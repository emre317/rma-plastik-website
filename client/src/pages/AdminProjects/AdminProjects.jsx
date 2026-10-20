import { useEffect, useRef, useState } from 'react';

import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import builtInProjects from '../../data/projects.builtin';
import {
  createProject, deleteProject, importProjects, listProjects, updateProject, uploadProjectImage,
} from '../../services/adminContentApi';
import { useConfirm } from '../../components/ui/ConfirmDialog';

const LANGS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const empty = (order = 0) => ({
  _id: null,
  image: '',
  published: true,
  order,
  i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { client: '', title: '' }])),
});

/* Custom molding reference projects (Özel Üretim page and home page) */
export default function AdminProjects() {
  usePageTitle('Referans Projeler');

  const call = useAdminApi();
  const confirm = useConfirm();
  const fileRef = useRef(null);

  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(null);
  const [lang, setLang] = useState('tr');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  async function load() {
    try {
      const { data } = await call(listProjects);
      setProjects(data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function edit(project) {
    setMessage(null);
    setLang('tr');
    setForm(
      project
        ? {
            _id: project._id,
            image: project.image || '',
            published: project.published,
            order: project.order,
            i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { client: '', title: '', ...project.i18n?.[code] }])),
          }
        : empty(((projects[projects.length - 1]?.order) || 0) + 10)
    );
  }

  const setText = (field, value) =>
    setForm((current) => ({ ...current, i18n: { ...current.i18n, [lang]: { ...current.i18n[lang], [field]: value } } }));

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setUploading(true);
      const { data } = await call(uploadProjectImage, file);
      setForm((current) => ({ ...current, image: data.url }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  }

  async function save(event) {
    event.preventDefault();

    try {
      setSaving(true);
      if (form._id) await call(updateProject, form._id, form);
      else await call(createProject, form);
      setForm(null);
      setMessage({ type: 'success', text: 'Proje kaydedildi. Sitede görünmesi için “Yayınla”ya basın.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(project) {
    if (!(await confirm({ title: 'Proje silinsin mi?', message: `"${project.i18n?.tr?.title || 'Proje'}" referans projelerden kalıcı olarak silinir.`, confirmLabel: 'Projeyi Sil', tone: 'danger' }))) return;

    try {
      await call(deleteProject, project._id);
      setProjects((list) => list.filter((item) => item._id !== project._id));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function importDefaults() {
    try {
      setSaving(true);
      await call(importProjects);
      setMessage({ type: 'success', text: 'Broşürdeki projeler panele aktarıldı. Artık düzenleyebilirsiniz.' });
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
          <h1>Referans Projeler</h1>
          <p>Özel Üretim sayfasında ve ana sayfada gösterilen müşteri projeleri. Ana sayfada sıradaki ilk dört proje görünür.</p>
        </div>
        {!form && (
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => edit(null)}>+ Yeni proje</button>
        )}
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
                <span>Proje başlığı{lang === 'tr' ? ' *' : ' (boşsa Türkçe)'}</span>
                <input dir={activeLanguage.dir} value={form.i18n[lang].title} maxLength={200} placeholder="ör. Drone tarım ilaçlama deposu" onChange={(event) => setText('title', event.target.value)} required={lang === 'tr'} />
              </label>

              <label className="cmsField">
                <span>Müşteri / kurum</span>
                <input dir={activeLanguage.dir} value={form.i18n[lang].client} maxLength={160} placeholder="ör. Baibars Mekatronik Havacılık" onChange={(event) => setText('client', event.target.value)} />
                <small>Müşteri adını yayınlamadan önce iznini aldığınızdan emin olun.</small>
              </label>

              <div className="cmsInline cmsInlineEven">
                <label className="cmsField">
                  <span>Sıra</span>
                  <input type="number" value={form.order} onChange={(event) => setForm({ ...form, order: event.target.value })} />
                  <small>Küçük sayı önce gösterilir.</small>
                </label>

                <label className="cmsCheck">
                  <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
                  <span>Sitede Göster</span>
                </label>
              </div>
            </div>

            <div className="cmsColumn">
              <div className="cmsImage adProjectImage">
                {form.image ? <img src={form.image} alt="" /> : <span>Görsel Yok</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload} />
              <div className="cmsRowActions">
                <button type="button" className="cmsButton" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Yükleniyor…' : form.image ? 'Görseli değiştir' : 'Görsel Yükle'}
                </button>
                {form.image && <button type="button" className="cmsButton cmsButtonDanger" onClick={() => setForm({ ...form, image: '' })}>Kaldır</button>}
              </div>
              <small className="cmsHint">Kare, arka planı sade bir görsel önerilir (JPG, PNG veya WEBP, en fazla 5 MB). Sitede yuvarlak çerçevede gösterilir.</small>
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
      ) : projects.length === 0 ? (
        !form && (
          <div className="cmsEmpty">
            <p>
              Panelde henüz proje yok; sitede şu an broşürdeki {builtInProjects.length} referans proje gösteriliyor.
              Düzenleyebilmek için önce panele aktarın ya da yeni proje ekleyin.
            </p>
            <button type="button" className="cmsButton cmsButtonPrimary" onClick={importDefaults} disabled={saving}>Broşür projelerini içe aktar</button>
          </div>
        )
      ) : (
        <ul className="adProjectGrid">
          {projects.map((project) => (
            <li key={project._id} className={`adProjectCard ${project.published ? '' : 'hidden'}`}>
              <span className="adProjectThumb">{project.image ? <img src={project.image} alt="" /> : null}</span>
              <span className="adProjectText">
                <strong>{project.i18n?.tr?.title}</strong>
                <small>{project.i18n?.tr?.client || '—'}</small>
                <em>{project.published ? 'Sitede' : 'Gizli'} · sıra {project.order}</em>
              </span>
              <span className="cmsRowActions">
                <button type="button" className="cmsButton" onClick={() => edit(project)}>Düzenle</button>
                <button type="button" className="cmsButton cmsButtonDanger" onClick={() => remove(project)}>Sil</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
