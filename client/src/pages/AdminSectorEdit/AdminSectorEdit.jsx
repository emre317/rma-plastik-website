import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import tr from '../../i18n/locales/tr';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import useProductGroupOptions, { tableGroup } from '../../hooks/useProductGroupOptions';
import builtInFamilies from '../../data/productTables.builtin';
import SECTOR_ICONS from '../../data/sectorIcons';
import Dropdown from '../../components/ui/Dropdown';
import { createSector, getSector, listFamilies, updateSector } from '../../services/adminContentApi';

const LANGS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

// Stored product suggested in the quote form when a visitor asks from this sector
const STORED = [
  { value: '', label: 'Önerme' },
  { value: 'water', label: 'Su' },
  { value: 'food', label: 'Gıda' },
  { value: 'acid', label: 'Asit' },
  { value: 'caustic', label: 'Kostik' },
  { value: 'adblue', label: 'AdBlue' },
  { value: 'fuel', label: 'Yakıt' },
];

const QUOTE_ITEM = '__quote';

const names = () => Object.fromEntries(LANGS.map(({ code }) => [code, { name: '' }]));

const emptyProduct = () => ({ key: Math.random().toString(36).slice(2), group: '', families: [], i18n: names() });

const emptySector = {
  sectorId: '',
  order: 100,
  published: true,
  icon: 'layers',
  hue: 210,
  stored: '',
  i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { title: '', description: '' }])),
  products: [],
};

// Brochure tables while none are saved in the panel
const BUILT_IN_TABLES = builtInFamilies.map((family) => ({
  familyId: family.id,
  group: family.group,
  rows: family.rows,
  i18n: { tr: { title: tr.productTables.families?.[family.id]?.title || family.id } },
}));

function slugify(value) {
  return value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* One sector: introduction texts, icon and the products used in it */
export default function AdminSectorEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const call = useAdminApi();
  const { options: groupOptions, labelOf } = useProductGroupOptions();

  usePageTitle(isNew ? 'Yeni sektör' : 'Sektörü düzenle');

  const [form, setForm] = useState(emptySector);
  const [families, setFamilies] = useState([]);
  const [lang, setLang] = useState('tr');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    call(listFamilies).then(({ data }) => setFamilies(data || [])).catch(() => {});
  }, [call]);

  useEffect(() => {
    if (isNew) return;

    (async () => {
      try {
        const { data } = await call(getSector, id);
        setForm({
          ...emptySector,
          ...data,
          i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { title: '', description: '', ...data.i18n?.[code] }])),
          products: (data.products || []).map((product) => ({
            ...emptyProduct(),
            group: product.group || '',
            families: product.families || [],
            i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { name: product.i18n?.[code]?.name || '' }])),
          })),
        });
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [call, id, isNew]);

  const tables = families.length ? families : BUILT_IN_TABLES;
  const tablesOf = useMemo(
    () => (groupId) => tables.filter((family) => tableGroup(family) === groupId),
    [tables]
  );

  const activeLanguage = LANGS.find((item) => item.code === lang);
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setText = (field, value) =>
    setForm((current) => ({ ...current, i18n: { ...current.i18n, [lang]: { ...current.i18n[lang], [field]: value } } }));

  const setProducts = (update) => setForm((current) => ({ ...current, products: update(current.products) }));
  const setProduct = (index, patch) => setProducts((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const setName = (index, value) =>
    setProducts((list) => list.map((item, i) => (i === index ? { ...item, i18n: { ...item.i18n, [lang]: { name: value } } } : item)));

  const moveProduct = (index, delta) =>
    setProducts((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  function chooseGroup(index, value) {
    const group = value === QUOTE_ITEM ? '' : value;
    const product = form.products[index];
    // A new item takes the group's name, so only the sector-specific part needs typing
    const name = product.i18n.tr.name || (group ? labelOf(group) : '');
    setProducts((list) => list.map((item, i) => (i === index
      ? { ...item, group, families: [], i18n: { ...item.i18n, tr: { name } } }
      : item)));
  }

  function toggleTable(index, familyId) {
    const product = form.products[index];
    const next = product.families.includes(familyId)
      ? product.families.filter((item) => item !== familyId)
      : [...product.families, familyId];
    setProduct(index, { families: next });
  }

  async function save(event) {
    event.preventDefault();
    setMessage(null);

    const missing = form.products.findIndex((product) => !product.i18n.tr.name.trim());
    if (missing >= 0) {
      setLang('tr');
      setMessage({ type: 'error', text: `${missing + 1}. ürünün Türkçe adı boş.` });
      return;
    }

    const body = {
      ...form,
      sectorId: form.sectorId || slugify(form.i18n.en.title || form.i18n.tr.title),
      products: form.products.map(({ group, families: list, i18n }) => ({ group, families: list, i18n })),
    };

    try {
      setSaving(true);
      if (isNew) {
        const { data } = await call(createSector, body);
        navigate(`/admin/sectors/${data._id}`, { replace: true });
      } else {
        await call(updateSector, id, body);
      }
      setMessage({ type: 'success', text: 'Sektör kaydedildi. Sitede görünmesi için “Yayınla”ya basın.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="adminContent"><div className="adminLoading">Yükleniyor…</div></section>;

  return (
    <section className="adminContent">
      <form onSubmit={save}>
        <header className="adPageHead">
          <div>
            <span className="adEyebrow"><Link to="/admin/sectors">Sektörler</Link></span>
            <h1>{isNew ? 'Yeni sektör' : form.i18n.tr.title || 'Sektörü düzenle'}</h1>
            <p>Sektör sayfasında ürünler buradaki sırayla gösterilir.</p>
          </div>
          <div className="cmsRowActions">
            <Link to="/admin/sectors" className="cmsButton">Listeye dön</Link>
            <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </div>
        </header>

        {message && <div className={`cmsMessage ${message.type}`}>{message.text}</div>}

        <div className="cmsTabs" role="tablist">
          {LANGS.map((item) => (
            <button key={item.code} type="button" role="tab" aria-selected={lang === item.code} className={lang === item.code ? 'active' : ''} onClick={() => setLang(item.code)}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="cmsVideoFormGrid">
          <div className="cmsColumn">
            <div className="cmsCard">
              <h2>Tanıtım</h2>

              <label className="cmsField">
                <span>Sektör adı{lang === 'tr' ? ' *' : ' (boşsa Türkçe)'}</span>
                <input dir={activeLanguage.dir} value={form.i18n[lang].title} maxLength={80} placeholder={lang === 'tr' ? 'ör. Tekstil' : form.i18n.tr.title} onChange={(event) => setText('title', event.target.value)} required={lang === 'tr'} />
              </label>

              <label className="cmsField">
                <span>Açıklama</span>
                <textarea dir={activeLanguage.dir} rows={3} value={form.i18n[lang].description} maxLength={400} placeholder={lang === 'tr' ? 'Kartta ve sektör sayfasının başında görünen kısa açıklama.' : form.i18n.tr.description} onChange={(event) => setText('description', event.target.value)} />
              </label>
            </div>
          </div>

          <div className="cmsColumn">
            <div className="cmsCard">
              <h2>Genel</h2>

              <div className="cmsField">
                <span>İkon</span>
                <div className="adIconPicker" role="radiogroup" aria-label="İkon">
                  {Object.entries(SECTOR_ICONS).map(([key, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={form.icon === key}
                      aria-label={key}
                      className={form.icon === key ? 'active' : ''}
                      onClick={() => set('icon', key)}
                    >
                      <Icon aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="cmsField">
                <span>Teklif formunda önerilecek stoklanacak ürün</span>
                <Dropdown value={form.stored} onChange={(value) => set('stored', value)} label="Stoklanacak ürün" options={STORED} />
              </div>

              <div className="cmsInline cmsInlineEven">
                <label className="cmsField">
                  <span>Sıra</span>
                  <input type="number" value={form.order} onChange={(event) => set('order', event.target.value)} />
                </label>

                <label className="cmsCheck">
                  <input type="checkbox" checked={form.published} onChange={(event) => set('published', event.target.checked)} />
                  <span>Sitede Göster</span>
                </label>
              </div>

              <label className="cmsField">
                <span>Adres</span>
                <input value={form.sectorId} placeholder="otomatik oluşturulur" disabled={!isNew} onChange={(event) => set('sectorId', slugify(event.target.value))} />
                <small>/tr/industries/{form.sectorId || '…'}{isNew ? '' : ' · Kayıtlı sektörün adresi değiştirilemez.'}</small>
              </label>
            </div>
          </div>
        </div>

        <div className="cmsCard adSectorProducts">
          <div className="adSectorProductsHead">
            <div>
              <h2>Sektördeki Ürünler ({form.products.length})</h2>
              <p className="cmsMuted">
                Ürün grubunu seçin ve ürünün bu sektördeki adını yazın (ör. “Silo Tanklar (Çökertme Tankı)”).
                Grubun yalnızca bazı tabloları bu sektöre uyuyorsa onları işaretleyin; hiçbiri işaretli değilse grubun tamamı kullanılır.
                Sitede olmayan bir ürün için “Talebe göre” seçin.
              </p>
            </div>
            <button type="button" className="cmsButton" onClick={() => setProducts((list) => [...list, emptyProduct()])}>
              <Plus aria-hidden="true" /> Ürün ekle
            </button>
          </div>

          {form.products.length === 0 ? (
            <p className="cmsEmpty">Henüz ürün yok. “Ürün ekle” ile başlayın.</p>
          ) : (
            <ol className="adSectorProductList">
              {form.products.map((product, index) => {
                const groupTables = product.group ? tablesOf(product.group) : [];

                return (
                  <li key={product.key}>
                    <span className="adSectorProductIndex">{index + 1}</span>

                    <div className="adSectorProductFields">
                      <div className="cmsInline cmsInlineEven">
                        <div className="cmsField">
                          <span>Ürün grubu</span>
                          <Dropdown
                            value={product.group || QUOTE_ITEM}
                            onChange={(value) => chooseGroup(index, value)}
                            label="Ürün grubu"
                            searchable
                            options={[{ value: QUOTE_ITEM, label: 'Talebe göre (katalogda yok)' }, ...groupOptions]}
                          />
                        </div>

                        <label className="cmsField">
                          <span>Sektördeki adı ({activeLanguage.label}){lang === 'tr' ? ' *' : ''}</span>
                          <input
                            dir={activeLanguage.dir}
                            value={product.i18n[lang].name}
                            maxLength={120}
                            placeholder={lang === 'tr' ? 'ör. Silo Tanklar (Çökertme Tankı)' : product.i18n.tr.name}
                            onChange={(event) => setName(index, event.target.value)}
                          />
                        </label>
                      </div>

                      {groupTables.length > 1 && (
                        <div className="adSectorTables">
                          <span>Tablolar:</span>
                          {groupTables.map((family) => (
                            <label key={family.familyId} className={`cmsColumnChip ${product.families.includes(family.familyId) ? 'on' : ''}`}>
                              <input type="checkbox" checked={product.families.includes(family.familyId)} onChange={() => toggleTable(index, family.familyId)} />
                              {family.i18n?.tr?.title || family.familyId}
                            </label>
                          ))}
                          <small className="cmsMuted">{product.families.length ? `${product.families.length} tablo seçili` : 'Grubun tamamı'}</small>
                        </div>
                      )}

                      {!product.group && <small className="cmsMuted">Kartta “Talebe göre” yazar ve “Teklif İste” düğmesi çıkar.</small>}
                    </div>

                    <span className="cmsRowTools adSectorProductActions">
                      <button type="button" onClick={() => moveProduct(index, -1)} disabled={index === 0} aria-label="Yukarı taşı"><ArrowUp aria-hidden="true" /></button>
                      <button type="button" onClick={() => moveProduct(index, 1)} disabled={index === form.products.length - 1} aria-label="Aşağı taşı"><ArrowDown aria-hidden="true" /></button>
                      <button type="button" className="danger" onClick={() => setProducts((list) => list.filter((_, i) => i !== index))} aria-label="Ürünü kaldır"><Trash2 aria-hidden="true" /></button>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="cmsRowActions adSectorSave">
          <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
        </div>
      </form>
    </section>
  );
}
