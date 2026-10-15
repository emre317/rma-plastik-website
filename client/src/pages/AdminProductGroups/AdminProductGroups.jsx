import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { tableGroup } from '../../hooks/useProductGroupOptions';
import builtInGroups from '../../data/productGroups.builtin';
import builtInFamilies from '../../data/productTables.builtin';
import tr from '../../i18n/locales/tr';
import Dropdown from '../../components/ui/Dropdown';
import {
  createProductGroup, deleteProductGroup, importProductGroups, listFamilies, listProductGroups,
  updateProductGroup, uploadProductImage,
} from '../../services/adminContentApi';

const LANGS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

// How the group is offered on the site (stored as page + quoteOnly)
const KINDS = [
  { value: 'tables', label: 'Model tabloları var', hint: '"Modelleri İncele" grubun ilk ürün tablosunu açar.' },
  { value: 'waterTanks', label: 'Model tabloları var – Su Depoları sayfası', hint: '"Modelleri İncele" filtreli Su Depoları sayfasını açar.' },
  { value: 'quote', label: 'Talebe göre üretim', hint: 'Model tablosu yok; kartta "Talebe göre" yazar ve "Teklif İste" düğmesi çıkar.' },
  { value: 'custom', label: 'Özel üretim', hint: '"Modelleri İncele" yerine Özel Üretim sayfasına gider.' },
];

// Brochure tables shown on the site while none are saved in the panel
const BUILT_IN_TABLES = builtInFamilies.map((family) => ({
  _id: '',
  familyId: family.id,
  group: family.group,
  rows: family.rows,
  published: true,
  i18n: { tr: { title: tr.productTables.families?.[family.id]?.title || family.id } },
}));

const kindOf = (group) => (group.quoteOnly ? 'quote' : group.page || 'tables');

const emptyTexts = () => Object.fromEntries(LANGS.map(({ code }) => [code, { label: '', title: '', description: '', application: '' }]));

const empty = (order = 0) => ({
  _id: null,
  groupId: '',
  order,
  published: true,
  image: '',
  hue: 210,
  kind: 'tables',
  monoblock: true,
  i18n: emptyTexts(),
});

function slugify(value) {
  return value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* Product groups (Ürün Grupları): menu, Products page and home portfolio */
export default function AdminProductGroups() {
  usePageTitle('Ürün Grupları');

  const call = useAdminApi();
  const fileRef = useRef(null);

  const [groups, setGroups] = useState([]);
  const [families, setFamilies] = useState([]);
  const [form, setForm] = useState(null);
  const [lang, setLang] = useState('tr');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  async function load() {
    try {
      const [groupList, familyList] = await Promise.all([call(listProductGroups), call(listFamilies)]);
      setGroups(groupList.data || []);
      setFamilies(familyList.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const tablesOf = (groupId) => (families.length ? families : BUILT_IN_TABLES).filter((family) => tableGroup(family) === groupId);

  function edit(group) {
    setMessage(null);
    setLang('tr');
    setForm(
      group
        ? {
            _id: group._id,
            groupId: group.groupId,
            order: group.order,
            published: group.published,
            image: group.image || '',
            hue: group.hue ?? 210,
            kind: kindOf(group),
            monoblock: group.monoblock !== false,
            i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { ...emptyTexts()[code], ...group.i18n?.[code] }])),
          }
        : empty(((groups[groups.length - 1]?.order) || 0) + 10)
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const setText = (field, value) =>
    setForm((current) => ({ ...current, i18n: { ...current.i18n, [lang]: { ...current.i18n[lang], [field]: value } } }));

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setUploading(true);
      const { data } = await call(uploadProductImage, file);
      setForm((current) => ({ ...current, image: data.url }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  }

  async function save(event) {
    event.preventDefault();

    const body = {
      ...form,
      groupId: form.groupId || slugify(form.i18n.tr.label),
      quoteOnly: form.kind === 'quote',
      page: form.kind === 'quote' ? 'tables' : form.kind,
    };

    try {
      setSaving(true);
      if (form._id) await call(updateProductGroup, form._id, body);
      else await call(createProductGroup, body);
      setForm(null);
      setMessage({ type: 'success', text: 'Ürün grubu kaydedildi. Sitede görünmesi için “Yayınla”ya basın.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(group) {
    try {
      const { data } = await call(updateProductGroup, group._id, { ...group, published: !group.published });
      setGroups((list) => list.map((item) => (item._id === group._id ? data : item)));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function remove(group) {
    if (!window.confirm(`"${group.i18n?.tr?.label || group.groupId}" grubu silinsin mi?`)) return;

    try {
      await call(deleteProductGroup, group._id);
      setGroups((list) => list.filter((item) => item._id !== group._id));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function importDefaults() {
    try {
      setSaving(true);
      await call(importProductGroups);
      setMessage({ type: 'success', text: 'Sitedeki ürün grupları panele aktarıldı. Artık düzenleyebilirsiniz.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const activeLanguage = LANGS.find((item) => item.code === lang);
  const placeholder = (field) => (lang === 'tr' ? '' : form.i18n.tr[field]);
  const formTables = form ? tablesOf(form.groupId) : [];
  const kind = KINDS.find((item) => item.value === form?.kind);

  return (
    <section className="adminContent">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Katalog</span>
          <h1>Ürün Grupları</h1>
          <p>
            Menüde, Ürünler sayfasında ve ana sayfadaki ürün portföyünde görünen gruplar.
            Bir gruba ürün tablosu eklemek için <Link to="/admin/product-families">Ürün Tabloları</Link> sayfasında tablonun grubunu seçin.
          </p>
        </div>
        {!form && groups.length > 0 && (
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => edit(null)}>+ Yeni grup</button>
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
                <span>Grup adı{lang === 'tr' ? ' *' : ' (boşsa Türkçe)'}</span>
                <input dir={activeLanguage.dir} value={form.i18n[lang].label} maxLength={60} placeholder={placeholder('label') || 'ör. Dikey Tanklar'} onChange={(event) => setText('label', event.target.value)} required={lang === 'tr'} />
                <small>Menüde ve kartların üstünde görünen kısa ad.</small>
              </label>

              <label className="cmsField">
                <span>Başlık</span>
                <input dir={activeLanguage.dir} value={form.i18n[lang].title} maxLength={120} placeholder={placeholder('title') || 'ör. Dikey Polietilen Tanklar'} onChange={(event) => setText('title', event.target.value)} />
              </label>

              <label className="cmsField">
                <span>Açıklama</span>
                <textarea dir={activeLanguage.dir} rows={4} value={form.i18n[lang].description} maxLength={600} placeholder={placeholder('description')} onChange={(event) => setText('description', event.target.value)} />
              </label>

              <label className="cmsField">
                <span>Kullanım alanı</span>
                <input dir={activeLanguage.dir} value={form.i18n[lang].application} maxLength={80} placeholder={placeholder('application') || 'ör. Su / Gıda / Kimya'} onChange={(event) => setText('application', event.target.value)} />
                <small>Kartın köşesindeki kısa etiket.</small>
              </label>
            </div>

            <div className="cmsColumn">
              <div className="cmsField">
                <span>Ürün tipi</span>
                <Dropdown value={form.kind} onChange={(value) => setForm({ ...form, kind: value })} label="Ürün tipi" options={KINDS.map(({ value, label }) => ({ value, label }))} />
                <small>{kind?.hint}</small>
              </div>

              {(form.kind === 'tables' || form.kind === 'waterTanks') && (
                <div className="cmsField">
                  <span>Bu gruptaki ürün tabloları</span>
                  {formTables.length ? (
                    <ul className="adGroupTables">
                      {formTables.map((family) => (
                        <li key={family.familyId}>
                          {family._id
                            ? <Link to={`/admin/product-families/${family._id}`}>{family.i18n?.tr?.title || family.familyId}</Link>
                            : <span>{family.i18n?.tr?.title}</span>}
                          <small>{family.rows.length} model{family.published ? '' : ' · gizli'}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <small className="cmsMuted">Henüz tablo yok. Tablo eklenene kadar grup sitede görünmez.</small>
                  )}
                </div>
              )}

              <label className="cmsCheck">
                <input type="checkbox" checked={form.monoblock} onChange={(event) => setForm({ ...form, monoblock: event.target.checked })} />
                <span>Tek parça (monoblok) ürün</span>
              </label>
              <small className="cmsHint">İşaretliyse model sayfalarında “Monoblok” rozeti gösterilir.</small>

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

              <label className="cmsField">
                <span>Kimlik</span>
                <input
                  value={form.groupId}
                  placeholder="otomatik oluşturulur"
                  disabled={Boolean(form._id)}
                  onChange={(event) => setForm({ ...form, groupId: slugify(event.target.value) })}
                />
                <small>{form._id ? 'Tablolar ve sektörler bu kimliğe bağlı olduğu için değiştirilemez.' : 'Boş bırakırsanız grup adından oluşturulur.'}</small>
              </label>

              <div className="cmsImage adProjectImage adGroupImage">
                {form.image ? <img src={form.image} alt="" /> : <span>Görsel Yok</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload} />
              <div className="cmsRowActions">
                <button type="button" className="cmsButton" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Yükleniyor…' : form.image ? 'Görseli değiştir' : 'Görsel Yükle'}
                </button>
                {form.image && <button type="button" className="cmsButton cmsButtonDanger" onClick={() => setForm({ ...form, image: '' })}>Kaldır</button>}
              </div>
              <small className="cmsHint">Arka planı sade, ürünü ortalanmış bir görsel önerilir (JPG, PNG veya WEBP, en fazla 5 MB).</small>
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
      ) : groups.length === 0 ? (
        <div className="cmsEmpty">
          <p>
            Panelde henüz ürün grubu yok; sitede şu an hazır {builtInGroups.length} grup gösteriliyor.
            Düzenleyebilmek için önce panele aktarın.
          </p>
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={importDefaults} disabled={saving}>
            {saving ? 'Aktarılıyor…' : 'Sitedeki grupları içe aktar'}
          </button>
        </div>
      ) : (
        <div className="cmsTable">
          <div className="cmsTableHead cmsFamilyRow">
            <span>Sıra</span>
            <span>Ürün Grubu</span>
            <span>Tip</span>
            <span>Tablo</span>
            <span>Durum</span>
            <span />
          </div>

          {groups.map((group) => {
            const tables = tablesOf(group.groupId);
            const models = tables.reduce((sum, family) => sum + family.rows.length, 0);
            const type = kindOf(group);

            return (
              <div key={group._id} className="cmsFamilyRow">
                <span className="cmsMuted">{group.order}</span>

                <span className="cmsProductName">
                  {group.image ? <img src={group.image} alt="" /> : <span className="cmsThumbEmpty" aria-hidden="true" />}
                  <span>
                    <strong>{group.i18n?.tr?.label || group.groupId}</strong>
                    <small>{group.i18n?.tr?.title || group.groupId}</small>
                  </span>
                </span>

                <span>{KINDS.find((item) => item.value === type)?.label.replace(' – Su Depoları sayfası', ' (Su Depoları)')}</span>

                <span>
                  {type === 'quote' || type === 'custom'
                    ? '–'
                    : tables.length ? `${tables.length} tablo · ${models} model` : <em className="cmsBadge">Tablo yok</em>}
                </span>

                <span>
                  <button
                    type="button"
                    className={`cmsStatus ${group.published ? 'on' : 'off'}`}
                    onClick={() => togglePublished(group)}
                    title="Yayın durumunu değiştir"
                  >
                    {group.published ? 'Yayında' : 'Gizli'}
                  </button>
                </span>

                <span className="cmsRowActions">
                  <button type="button" className="cmsButton" onClick={() => edit(group)}>Düzenle</button>
                  <button type="button" className="cmsButton cmsButtonDanger" onClick={() => remove(group)}>Sil</button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
