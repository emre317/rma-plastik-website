import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Images, NotebookPen, X } from 'lucide-react';

import tr from '../../i18n/locales/tr';
import en from '../../i18n/locales/en';
import ar from '../../i18n/locales/ar';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { COLUMN_KEYS, WATER_USES } from '../../data/productTables.builtin';
import useProductGroupOptions, { tableGroup } from '../../hooks/useProductGroupOptions';
import {
  createFamily,
  getFamily,
  updateFamily,
  uploadProductImage,
} from '../../services/adminContentApi';
import Dropdown from '../../components/ui/Dropdown';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import ImageGalleryEditor from '../../components/admin/ImageGalleryEditor';
import FeaturesEditor, { featureLines } from '../../components/admin/FeaturesEditor';

// Cover + gallery (server limits: 16 extra photos for a family, 12 for a model)
const FAMILY_PHOTOS = 17;
const ROW_PHOTOS = 13;
const photoList = (item) => [item.image, ...(item.images || [])].filter(Boolean);

const LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const columnLabel = (key) => tr.productTables.columns[key] || key;
const useLabel = (key) => tr.waterTanks.uses[key] || key;

const LOCALES = { tr, en, ar };
const emptyText = { title: '', text: '', featuresTitle: '', features: '' };

// A model's own description and features, per language
const emptyRowTexts = () => Object.fromEntries(LANGUAGES.map(({ code }) => [code, { text: '', features: '' }]));
const rowTexts = (i18n) => Object.fromEntries(LANGUAGES.map(({ code }) => [code, { text: i18n?.[code]?.text || '', features: i18n?.[code]?.features || '' }]));
const hasRowTexts = (row) => LANGUAGES.some(({ code }) => row.i18n?.[code]?.text || row.i18n?.[code]?.features);

/* Brochure list shown on the site while a family has no list of its own */
function defaultFeatures(family, code) {
  const own = LOCALES[code].productTables.families?.[family.familyId]?.features;
  const list = Array.isArray(own) && own.length ? own : family.waterTank?.enabled ? LOCALES[code].waterTanks.features : [];
  return (Array.isArray(list) ? list : []).join('\n');
}

const defaultFeaturesTitle = (family, code) =>
  family.waterTank?.enabled ? LOCALES[code].productModel.standardTitle : LOCALES[code].productModel.featuresTitle;

const emptyFamily = {
  familyId: '',
  group: 'vertical',
  order: 100,
  published: true,
  image: '',
  images: [],
  columns: ['volume', 'diameter', 'height'],
  i18n: { tr: { ...emptyText }, en: { ...emptyText }, ar: { ...emptyText } },
  rows: [],
  waterTank: { enabled: false, orientation: 'vertical', layer: 'single', uses: ['water'] },
};

const emptyRow = () => ({ code: '', image: '', images: [], values: {}, i18n: emptyRowTexts() });

function slugify(value) {
  return value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/* "RD 100<TAB>100<TAB>48" (copied from Excel) or "RD 100;100;48" -> rows */
function parsePasted(text, columns) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(line.includes('\t') ? '\t' : ';').map((cell) => cell.trim()))
    .filter((cells) => cells[0])
    .map(([code, ...cells]) => ({
      code,
      image: '',
      images: [],
      i18n: emptyRowTexts(),
      values: Object.fromEntries(columns.map((key, index) => [key, cells[index] ?? ''])),
    }));
}

export default function AdminProductFamilyEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const call = useAdminApi();
  const confirm = useConfirm();
  const { groups, options: groupOptions, loaded: groupsLoaded } = useProductGroupOptions();

  usePageTitle(isNew ? 'Yeni ürün ailesi' : 'Ürün ailesini düzenle');

  const [form, setForm] = useState(emptyFamily);
  const [lang, setLang] = useState('tr');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [, setUploading] = useState('');
  const [message, setMessage] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  // Nothing saved for this family yet: its feature boxes start from the brochure list (see the effect below)
  const [needsPrefill, setNeedsPrefill] = useState(false);
  const [featuresPrefilled, setFeaturesPrefilled] = useState(false);

  // Index of the model whose description and features are being edited (-1: none)
  const [rowText, setRowText] = useState(-1);
  const [rowLang, setRowLang] = useState('tr');

  // Index of the model whose photos are being edited (-1: none)
  const [rowGallery, setRowGallery] = useState(-1);

  useEffect(() => {
    if (isNew) {
      return;
    }

    (async () => {
      try {
        const { data } = await call(getFamily, id);
        setNeedsPrefill(!LANGUAGES.some(({ code }) => data.i18n?.[code]?.features));
        setForm({
          ...emptyFamily,
          ...data,
          images: Array.isArray(data.images) ? data.images : [],
          group: tableGroup(data),
          i18n: Object.fromEntries(LANGUAGES.map(({ code }) => [code, { ...emptyText, ...data.i18n?.[code] }])),
          waterTank: { ...emptyFamily.waterTank, ...data.waterTank },
          rows: (data.rows || []).map((row) => ({
            code: row.code,
            image: row.image || '',
            images: Array.isArray(row.images) ? row.images : [],
            i18n: rowTexts(row.i18n),
            values: Object.fromEntries(Object.entries(row.values || {}).map(([key, value]) => [key, String(value)])),
          })),
        });
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [call, id, isNew]);

  // Features written for the family's product group (Ürün Grupları); shown before the family's own
  const group = groups.find((item) => item.id === form.group);
  const groupFeatures = (code) => featureLines(group?.i18n?.[code]?.features || group?.i18n?.tr?.features);

  /*
    A family with no saved list shows the brochure list on the site (unless its
    group has a list). The boxes start from that list, so it can be edited.
  */
  useEffect(() => {
    if (!needsPrefill || loading || !groupsLoaded) return;
    setNeedsPrefill(false);

    const saved = groups.find((item) => item.id === form.group);
    if (featureLines(saved?.i18n?.tr?.features).length || !defaultFeatures(form, 'tr')) return;

    setFeaturesPrefilled(true);
    setForm((current) => ({
      ...current,
      i18n: Object.fromEntries(LANGUAGES.map(({ code }) => [code, { ...current.i18n[code], features: defaultFeatures(current, code) }])),
    }));
  }, [needsPrefill, loading, groupsLoaded, groups, form]);

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const setText = (field, value) =>
    setForm((current) => ({ ...current, i18n: { ...current.i18n, [lang]: { ...current.i18n[lang], [field]: value } } }));

  const setWater = (field, value) =>
    setForm((current) => ({ ...current, waterTank: { ...current.waterTank, [field]: value } }));

  const toggleColumn = (key) =>
    set(
      'columns',
      form.columns.includes(key)
        ? form.columns.filter((item) => item !== key)
        : COLUMN_KEYS.filter((item) => item === key || form.columns.includes(item))
    );

  const setRows = (update) => setForm((current) => ({ ...current, rows: update(current.rows) }));

  const setCell = (index, key, value) =>
    setRows((rows) =>
      rows.map((row, i) =>
        i !== index ? row : key === 'code' ? { ...row, code: value } : { ...row, values: { ...row.values, [key]: value } }
      )
    );

  const moveRow = (index, delta) =>
    setRows((rows) => {
      const target = index + delta;
      if (target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const duplicateRow = (index) =>
    setRows((rows) => [
      ...rows.slice(0, index + 1),
      { ...rows[index], images: [...(rows[index].images || [])], values: { ...rows[index].values }, i18n: rowTexts(rows[index].i18n) },
      ...rows.slice(index + 1),
    ]);

  const setRowTextField = (index, field, value) =>
    setRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, i18n: { ...row.i18n, [rowLang]: { ...row.i18n[rowLang], [field]: value } } } : row))
    );

  const removeRow = async (index, code) => {
    const ok = await confirm({
      title: 'Model silinsin mi?',
      message: `${code?.trim() || 'Bu satır'} tablodan kaldırılır. Değişiklik "Kaydet" ile kalıcı olur.`,
      confirmLabel: 'Modeli Sil',
      tone: 'danger',
    });
    if (ok) setRows((rows) => rows.filter((_, i) => i !== index));
  };

  async function upload(file, target) {
    try {
      setUploading(target);
      const { data } = await call(uploadProductImage, file);
      return data.url;
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      return '';
    } finally {
      setUploading('');
    }
  }

  // Photo list -> cover (image) + gallery (images)
  const setFamilyPhotos = (list) => setForm((current) => ({ ...current, image: list[0] || '', images: list.slice(1) }));
  const setRowPhotos = (index, list) =>
    setRows((rows) => rows.map((row, i) => (i === index ? { ...row, image: list[0] || '', images: list.slice(1) } : row)));

  function applyPaste(mode) {
    const parsed = parsePasted(pasteText, form.columns);

    if (!parsed.length) {
      setMessage({ type: 'error', text: 'Yapıştırılan metinde satır bulunamadı.' });
      return;
    }

    setRows((rows) => (mode === 'replace' ? parsed : [...rows, ...parsed]));
    setPasteText('');
    setPasteOpen(false);
    setMessage({ type: 'success', text: `${parsed.length} satır eklendi. Kontrol edip “Kaydet”e basın.` });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);

    const payload = {
      ...form,
      familyId: form.familyId || slugify(form.i18n.en.title || form.i18n.tr.title),
    };

    const emptyCodes = form.rows.filter((row) => !row.code.trim()).length;

    try {
      setSaving(true);

      if (isNew) {
        const { data } = await call(createFamily, payload);
        navigate(`/admin/product-families/${data._id}`, { replace: true });
      } else {
        const { data } = await call(updateFamily, id, payload);
        set('familyId', data.familyId);
        setFeaturesPrefilled(false);
      }

      setMessage({
        type: 'success',
        text: `Kaydedildi. Sitede görünmesi için “Yayınla”ya basın.${emptyCodes ? ` Ürün kodu boş ${emptyCodes} satır kaydedilmedi.` : ''}`,
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

  const activeLanguage = LANGUAGES.find((item) => item.code === lang);
  const columns = ['code', ...form.columns];

  return (
    <section className="adminContent">

      <div className="adminPageHeader">
        <div>
          <Link to="/admin/product-families" className="adBack"><ArrowLeft aria-hidden="true" />Ürün Tabloları</Link>
          <h1>{isNew ? 'Yeni ürün ailesi' : form.i18n.tr.title || 'Ürün ailesini düzenle'}</h1>
        </div>
      </div>

      <form className="cmsForm" onSubmit={handleSubmit}>

        {message && (
          <div className={`cmsMessage ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
            {message.text}
          </div>
        )}

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
                  {!form.i18n[item.code].title && <span className="cmsDot" title="Başlık boş" />}
                </button>
              ))}
            </div>

            <p className="cmsHint">Boş bırakılan İngilizce/Arapça alanlarda Türkçe metin gösterilir.</p>

            <label className="cmsField">
              <span>Başlık{lang === 'tr' ? ' *' : ''}</span>
              <input
                dir={activeLanguage.dir}
                value={form.i18n[lang].title}
                placeholder="ör. Dikey Tanklar"
                onChange={(event) => setText('title', event.target.value)}
                required={lang === 'tr'}
              />
            </label>

            <label className="cmsField">
              <span>Açıklama</span>
              <textarea
                rows={4}
                dir={activeLanguage.dir}
                value={form.i18n[lang].text}
                onChange={(event) => setText('text', event.target.value)}
              />
            </label>

            <div className="cmsFeatures">
              <h2>Standart Özellikler</h2>
              <p className="cmsHint">
                Bu ailenin tüm model sayfalarında ve teknik föylerinde yeşil tikli liste olarak gösterilir.
                Tek bir modele özel açıklama ve özellikleri aşağıdaki tabloda modelin “Açıklama” düğmesinden yazın.
              </p>

              {featuresPrefilled && (
                <p className="cmsHint cmsFeaturesNote">
                  Bu aile için henüz liste kaydedilmemiş; sitede şu an gösterilen katalog listesi yüklendi. Düzenleyip “Kaydet”e basın.
                </p>
              )}

              {groupFeatures(lang).length > 0 && (
                <p className="cmsHint cmsFeaturesNote">
                  “{group.label}” grubunun {groupFeatures(lang).length} ortak özelliği bu ailede de gösterilir
                  (<Link to="/admin/product-groups">Ürün Grupları</Link>). Buraya yalnızca bu aileye özel olanları yazın.
                </p>
              )}

              <FeaturesEditor
                dir={activeLanguage.dir}
                title={form.i18n[lang].featuresTitle}
                onTitle={(value) => setText('featuresTitle', value)}
                defaultTitle={group?.i18n?.[lang]?.featuresTitle || defaultFeaturesTitle(form, lang)}
                features={form.i18n[lang].features}
                onFeatures={(value) => setText('features', value)}
                inherited={groupFeatures(lang)}
                inheritedLabel="ürün grubundan"
              />
            </div>

            <div className="cmsField">
              <span>Tablo Sütunları</span>
              <div className="cmsColumnPicker">
                <span className="cmsColumnChip fixed">{columnLabel('code')}</span>
                {COLUMN_KEYS.map((key) => (
                  <label key={key} className={`cmsColumnChip ${form.columns.includes(key) ? 'on' : ''}`}>
                    <input type="checkbox" checked={form.columns.includes(key)} onChange={() => toggleColumn(key)} />
                    {columnLabel(key)}
                  </label>
                ))}
              </div>
              <small className="cmsMuted">Kaldırılan bir sütunun değerleri kaydederken silinir.</small>
            </div>
          </div>

          <div className="cmsColumn">
            <div className="cmsCard">
              <h2>Genel</h2>

              <label className="cmsCheck">
                <input type="checkbox" checked={form.published} onChange={(event) => set('published', event.target.checked)} />
                <span>Sitede Yayında</span>
              </label>

              <div className="cmsField">
                <span>Ürün Grubu</span>
                <Dropdown
                  value={form.group}
                  onChange={(group) => set('group', group)}
                  label="Ürün Grubu"
                  placeholder="Grup seçin"
                  searchable
                  options={groupOptions}
                />
                <small>Tablo sitede bu grubun altında listelenir. Gruplar <Link to="/admin/product-groups">Ürün Grupları</Link> sayfasından yönetilir.</small>
              </div>

              <label className="cmsField">
                <span>Sıra (küçük olan önce)</span>
                <input type="number" value={form.order} onChange={(event) => set('order', event.target.value)} />
              </label>

              <label className="cmsField">
                <span>Kimlik (sayfadaki bağlantı)</span>
                <input value={form.familyId} placeholder="otomatik oluşturulur" onChange={(event) => set('familyId', slugify(event.target.value))} />
                <small>/tr/product-tables#{form.familyId || '…'}</small>
              </label>
            </div>

            <div className="cmsCard">
              <h2>Görseller</h2>
              <p className="cmsHint">
                Ailenin kapak görseli ve tüm modellerde gösterilecek ortak görseller (ör. kapak, vana çıkışı detayı).
                Modele özel görseller tablodaki “Görseller” sütunundan eklenir.
              </p>

              <ImageGalleryEditor
                images={photoList(form)}
                onChange={setFamilyPhotos}
                upload={(file) => upload(file, 'family')}
                max={FAMILY_PHOTOS}
                title={form.i18n.tr.title}
                compact
              />
            </div>

            <div className="cmsCard">
              <h2>Su deposu seçici</h2>

              <label className="cmsCheck">
                <input type="checkbox" checked={form.waterTank.enabled} onChange={(event) => setWater('enabled', event.target.checked)} />
                <span>Bu ailenin modellerini “Su Depoları” sayfasında göster</span>
              </label>

              {form.waterTank.enabled && (
                <>
                  <div>
                    <div className="cmsField">
                      <span>Tip</span>
                      <Dropdown
                        value={form.waterTank.orientation}
                        onChange={(value) => setWater('orientation', value)}
                        label="Tip"
                        options={[{ value: 'vertical', label: 'Dikey' }, { value: 'horizontal', label: 'Yatay' }]}
                      />
                    </div>

                    <div className="cmsField">
                      <span>Yapı</span>
                      <Dropdown
                        value={form.waterTank.layer}
                        onChange={(value) => setWater('layer', value)}
                        label="Yapı"
                        options={[{ value: 'single', label: 'Tek Katmanlı' }, { value: 'double', label: 'Çift Katmanlı' }]}
                      />
                    </div>
                  </div>

                  <div className="cmsField">
                    <span>Kullanım Alanları</span>
                    <div className="cmsColumnPicker">
                      {WATER_USES.map((use) => (
                        <label key={use} className={`cmsColumnChip ${form.waterTank.uses.includes(use) ? 'on' : ''}`}>
                          <input
                            type="checkbox"
                            checked={form.waterTank.uses.includes(use)}
                            onChange={() =>
                              setWater(
                                'uses',
                                form.waterTank.uses.includes(use)
                                  ? form.waterTank.uses.filter((item) => item !== use)
                                  : [...form.waterTank.uses, use]
                              )
                            }
                          />
                          {useLabel(use)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <small className="cmsMuted">Seçicide görünmesi için tabloda Hacim ve Yükseklik sütunları dolu olmalıdır.</small>
                </>
              )}
            </div>
          </div>

          {/* Rows */}
          <div className="cmsCard cmsCardFull">
            <div className="cmsRowsHead">
              <h2>Modeller <span className="cmsMuted">({form.rows.length})</span></h2>

              <div className="cmsRowActions">
                <button type="button" className="cmsButton" onClick={() => setPasteOpen((open) => !open)}>
                  Excel’den yapıştır
                </button>
                <button type="button" className="cmsButton" onClick={() => setRows((rows) => [...rows, emptyRow()])}>
                  + Satır ekle
                </button>
              </div>
            </div>

            {pasteOpen && (
              <div className="cmsPaste">
                <p className="cmsHint">
                  Excel’de satırları seçip kopyalayın ve buraya yapıştırın. Sütun sırası:{' '}
                  <strong>{columns.map(columnLabel).join(' · ')}</strong>
                </p>
                <textarea
                  rows={6}
                  value={pasteText}
                  placeholder={`RD 100\t100\t48\t75\nRD 200\t201\t59\t102`}
                  onChange={(event) => setPasteText(event.target.value)}
                />
                <div className="cmsRowActions">
                  <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => applyPaste('append')}>Sona Ekle</button>
                  <button type="button" className="cmsButton cmsButtonDanger" onClick={() => applyPaste('replace')}>Tabloyu bununla değiştir</button>
                </div>
              </div>
            )}

            <p className="cmsHint">
              Sayılar (ör. 1000, 48) sıralama ve filtrelerde kullanılır; “40-60”, “35 x 35”, 3/4" gibi değerler yazıldığı gibi gösterilir.
              Hacim litre, ölçüler cm cinsindendir.
            </p>


            <div className="cmsRowsTableWrap">
              <table className="cmsRowsTable">
                <thead>
                  <tr>
                    <th>#</th>
                    {columns.map((key) => (
                      <th key={key}>{columnLabel(key)}</th>
                    ))}
                    <th>Görseller</th>
                    <th>Açıklama</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {form.rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + 4} className="cmsMuted cmsRowsEmpty">Henüz model yok. “Satır ekle” ya da “Excel’den yapıştır” ile ekleyin.</td>
                    </tr>
                  )}

                  {form.rows.map((row, index) => (
                    <tr key={index}>
                      <td className="cmsMuted">{index + 1}</td>
                      {columns.map((key) => (
                        <td key={key}>
                          <input
                            value={key === 'code' ? row.code : row.values[key] ?? ''}
                            onChange={(event) => setCell(index, key, event.target.value)}
                            aria-label={`${index + 1}. satır – ${columnLabel(key)}`}
                            className={key === 'code' ? 'code' : ''}
                            required={key === 'code'}
                          />
                        </td>
                      ))}
                      <td>
                        <span className="cmsRowImage">
                          <button
                            type="button"
                            onClick={() => setRowGallery(index)}
                            title="Bu modelin görselleri (boşsa ailenin görseli kullanılır)"
                            aria-label={`${row.code || `${index + 1}. satır`} – görseller (${photoList(row).length})`}
                          >
                            {row.image ? <img src={row.image} alt="" /> : <Images aria-hidden="true" />}
                          </button>
                          {photoList(row).length > 1 && <span className="cmsRowImageCount">{photoList(row).length}</span>}
                        </span>
                      </td>
                      <td>
                        <span className={`cmsRowText ${hasRowTexts(row) ? 'filled' : ''}`}>
                          <button
                            type="button"
                            onClick={() => { setRowLang('tr'); setRowText(index); }}
                            title={hasRowTexts(row) ? 'Bu modele özel açıklama ve özellikler (dolu)' : 'Bu modele özel açıklama ve özellik ekle'}
                            aria-label={`${row.code || `${index + 1}. satır`} – açıklama ve özellikler`}
                          >
                            <NotebookPen aria-hidden="true" />
                          </button>
                        </span>
                      </td>
                      <td>
                        <span className="cmsRowTools">
                          <button type="button" onClick={() => moveRow(index, -1)} disabled={index === 0} aria-label="Yukarı taşı">↑</button>
                          <button type="button" onClick={() => moveRow(index, 1)} disabled={index === form.rows.length - 1} aria-label="Aşağı taşı">↓</button>
                          <button type="button" onClick={() => duplicateRow(index)} aria-label="Kopyala" title="Kopyala">⧉</button>
                          <button type="button" className="danger" onClick={() => removeRow(index, row.code)} aria-label="Sil" title="Sil">×</button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {rowGallery >= 0 && form.rows[rowGallery] && createPortal(
          <div className="ig3dLayer" onMouseDown={(event) => { if (event.target === event.currentTarget) setRowGallery(-1); }}>
            <div className="ig3dPanel igRowPanel" role="dialog" aria-modal="true" aria-label="Model görselleri">
              <div className="ig3dHead">
                <div>
                  <strong>{form.rows[rowGallery].code || `${rowGallery + 1}. satır`} · Görseller</strong>
                  <small>Değişiklikler “Kaydet” ile kalıcı olur. Boş bırakılırsa ailenin görselleri gösterilir.</small>
                </div>
                <button type="button" onClick={() => setRowGallery(-1)} aria-label="Kapat"><X aria-hidden="true" /></button>
              </div>
              <ImageGalleryEditor
                images={photoList(form.rows[rowGallery])}
                onChange={(list) => setRowPhotos(rowGallery, list)}
                upload={(file) => upload(file, `row-${rowGallery}`)}
                max={ROW_PHOTOS}
                title={`${form.rows[rowGallery].code} – ${form.i18n.tr.title}`}
              />
              <div className="igRowActions">
                <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => setRowGallery(-1)}>Tamam</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {rowText >= 0 && form.rows[rowText] && createPortal(
          <div className="ig3dLayer" onMouseDown={(event) => { if (event.target === event.currentTarget) setRowText(-1); }}>
            <div className="ig3dPanel cmsRowTextPanel" role="dialog" aria-modal="true" aria-label="Model açıklaması ve özellikleri">
              <div className="ig3dHead">
                <div>
                  <strong>{form.rows[rowText].code || `${rowText + 1}. satır`} · Açıklama ve Özellikler</strong>
                  <small>Yalnızca bu modelin sayfasında ve föyünde gösterilir. Değişiklikler “Kaydet” ile kalıcı olur.</small>
                </div>
                <button type="button" onClick={() => setRowText(-1)} aria-label="Kapat"><X aria-hidden="true" /></button>
              </div>

              <div className="cmsRowTextBody">
                <div className="cmsTabs" role="tablist">
                  {LANGUAGES.map((item) => (
                    <button key={item.code} type="button" role="tab" aria-selected={rowLang === item.code} className={rowLang === item.code ? 'active' : ''} onClick={() => setRowLang(item.code)}>
                      {item.label}
                    </button>
                  ))}
                </div>

                <label className="cmsField">
                  <span>Model Açıklaması</span>
                  <textarea
                    rows={4}
                    maxLength={800}
                    dir={LANGUAGES.find((item) => item.code === rowLang).dir}
                    value={form.rows[rowText].i18n[rowLang].text}
                    placeholder={form.i18n[rowLang].text || form.i18n.tr.text}
                    onChange={(event) => setRowTextField(rowText, 'text', event.target.value)}
                  />
                  <small>Boş bırakılırsa ailenin açıklaması gösterilir.</small>
                </label>

                <FeaturesEditor
                  dir={LANGUAGES.find((item) => item.code === rowLang).dir}
                  title={form.i18n[rowLang].featuresTitle}
                  defaultTitle={group?.i18n?.[rowLang]?.featuresTitle || defaultFeaturesTitle(form, rowLang)}
                  features={form.rows[rowText].i18n[rowLang].features}
                  onFeatures={(value) => setRowTextField(rowText, 'features', value)}
                  inherited={[...groupFeatures(rowLang), ...featureLines(form.i18n[rowLang].features || form.i18n.tr.features)]}
                  inheritedLabel="ürün grubundan ve aileden"
                  placeholder={'Bu modele özel özellikler\n…'}
                />
              </div>

              <div className="igRowActions">
                <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => setRowText(-1)}>Tamam</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        <div className="cmsSaveBar">
          <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>

      </form>
    </section>
  );
}
