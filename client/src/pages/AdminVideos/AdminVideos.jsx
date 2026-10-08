import { useEffect, useState } from 'react';

import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { youtubeThumbnail } from '../../components/content/YouTubeEmbed';
import { createVideo, deleteVideo, listVideos, updateVideo } from '../../services/adminContentApi';

const LANGS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const empty = () => ({
  _id: null,
  url: '',
  published: true,
  order: 0,
  uploadDate: '',
  i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { title: '', description: '' }])),
});

function parseId(value) {
  const match =
    value.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/) ||
    value.trim().match(/^([A-Za-z0-9_-]{11})$/);

  return match ? match[1] : '';
}

export default function AdminVideos() {
  usePageTitle('Videolar');

  const call = useAdminApi();
  const [videos, setVideos] = useState([]);
  const [form, setForm] = useState(null);
  const [lang, setLang] = useState('tr');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function load() {
    try {
      const { data } = await call(listVideos);
      setVideos(data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function edit(video) {
    setMessage(null);
    setLang('tr');
    setForm(
      video
        ? {
            _id: video._id,
            url: `https://youtu.be/${video.youtubeId}`,
            published: video.published,
            order: video.order,
            uploadDate: video.uploadDate ? video.uploadDate.slice(0, 10) : '',
            i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { title: '', description: '', ...video.i18n?.[code] }])),
          }
        : empty()
    );
  }

  const setText = (field, value) =>
    setForm((current) => ({ ...current, i18n: { ...current.i18n, [lang]: { ...current.i18n[lang], [field]: value } } }));

  async function save(event) {
    event.preventDefault();

    const body = { ...form, youtubeId: form.url };

    try {
      setSaving(true);
      if (form._id) await call(updateVideo, form._id, body);
      else await call(createVideo, body);
      setForm(null);
      setMessage({ type: 'success', text: 'Video kaydedildi. Sitede görünmesi için “Yayınla”ya basın.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(video) {
    if (!window.confirm(`"${video.i18n?.tr?.title || video.youtubeId}" listeden kaldırılsın mı? (YouTube'daki video silinmez.)`)) return;

    try {
      await call(deleteVideo, video._id);
      setVideos((list) => list.filter((item) => item._id !== video._id));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  const previewId = form ? parseId(form.url) : '';
  const activeLanguage = LANGS.find((item) => item.code === lang);

  return (
    <section className="adminContent">
      <div className="adminPageHeader">
        <div>
          <span className="adminLabel">İÇERİK YÖNETİMİ</span>
          <h1>Videolar</h1>
        </div>
        {!form && <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => edit(null)}>+ Video ekle</button>}
      </div>

      <p className="cmsHint">
        YouTube’daki videolarınızın bağlantısını ekleyin; Videolar sayfasında hızlı yüklenen oynatıcıyla gösterilir.
        <br />
        <strong>Sırası en küçük olan (ör. 0) yayındaki video, ana sayfanın açılışında sessiz ve otomatik oynar.</strong>
      </p>

      {message && <div className={`cmsMessage ${message.type}`}>{message.text}</div>}

      {form && (
        <form className="cmsCard cmsVideoForm" onSubmit={save}>
          <div className="cmsVideoFormGrid">
            <div className="cmsColumn">
              <label className="cmsField">
                <span>YouTube bağlantısı *</span>
                <input value={form.url} placeholder="https://www.youtube.com/watch?v=… veya https://youtu.be/…" onChange={(event) => setForm({ ...form, url: event.target.value })} required />
                {form.url && !previewId && <small className="cmsWarn">Bağlantıdan video bulunamadı.</small>}
              </label>

              <div className="cmsTabs" role="tablist">
                {LANGS.map((item) => (
                  <button key={item.code} type="button" role="tab" aria-selected={lang === item.code} className={lang === item.code ? 'active' : ''} onClick={() => setLang(item.code)}>
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="cmsField">
                <span>Başlık{lang === 'tr' ? ' *' : ' (boşsa Türkçe)'}</span>
                <input dir={activeLanguage.dir} value={form.i18n[lang].title} onChange={(event) => setText('title', event.target.value)} required={lang === 'tr'} />
              </label>

              <label className="cmsField">
                <span>Açıklama</span>
                <textarea rows={3} dir={activeLanguage.dir} value={form.i18n[lang].description} onChange={(event) => setText('description', event.target.value)} />
              </label>

              <div className="cmsInline cmsInlineEven">
                <label className="cmsField">
                  <span>YouTube yükleme tarihi</span>
                  <input type="date" value={form.uploadDate} onChange={(event) => setForm({ ...form, uploadDate: event.target.value })} />
                  <small>Google video sonuçları için gerekli.</small>
                </label>

                <label className="cmsField">
                  <span>Sıra</span>
                  <input type="number" value={form.order} onChange={(event) => setForm({ ...form, order: event.target.value })} />
                </label>
              </div>

              <label className="cmsCheck">
                <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
                <span>Sitede Göster</span>
              </label>
            </div>

            <div className="cmsImage">
              {previewId ? <img src={youtubeThumbnail(previewId)} alt="" /> : <span>Önizleme</span>}
            </div>
          </div>

          <div className="cmsRowActions">
            <button type="button" className="cmsButton" onClick={() => setForm(null)}>Vazgeç</button>
            <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving || !previewId}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="adminLoading">Yükleniyor…</div>
      ) : videos.length === 0 ? (
        !form && <div className="cmsEmpty"><p>Henüz video eklenmedi.</p></div>
      ) : (
        <div className="cmsVideoList">
          {videos.map((video) => (
            <div key={video._id} className="cmsVideoItem">
              <img src={youtubeThumbnail(video.youtubeId)} alt="" />
              <div>
                <strong>
                  {video.i18n?.tr?.title}
                  {video._id === videos.find((item) => item.published)?._id && (
                    <span className="cmsStatus on cmsStatusStatic cmsHeroBadge">Ana sayfa açılışı</span>
                  )}
                </strong>
                <small>{video.published ? 'Sitede' : 'Gizli'} · sıra {video.order}</small>
              </div>
              <div className="cmsRowActions">
                <button type="button" className="cmsButton" onClick={() => edit(video)}>Düzenle</button>
                <button type="button" className="cmsButton cmsButtonDanger" onClick={() => remove(video)}>Kaldır</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
