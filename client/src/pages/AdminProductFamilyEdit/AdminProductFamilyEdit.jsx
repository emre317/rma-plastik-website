import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import tr from '../../i18n/locales/tr';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { COLUMN_KEYS, GROUPS, WATER_USES } from '../../data/productTables.builtin';
import {
  createFamily,
  getFamily,
  updateFamily,
  uploadProductImage,
} from '../../services/adminContentApi';
import Dropdown from '../../components/ui/Dropdown';

const LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const columnLabel = (key) => tr.productTables.columns[key] || key;
const groupLabel = (key) => tr.productTables.groups[key] || key;
const useLabel = (key) => tr.waterTanks.uses[key] || key;

const emptyFamily = {
  familyId: '',
  group: 'tanks',
  order: 100,
  published: true,
  image: '',
  columns: ['volume', 'diameter', 'height'],
  i18n: { tr: { title: '', text: '' }, en: { title: '', text: '' }, ar: { title: '', text: '' } },
  rows: [],
  waterTank: { enabled: false, orientation: 'vertical', layer: 'single', uses: ['water'] },
};

const emptyRow = () => ({ code: '', image: '', values: {} });

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
      values: Object.fromEntries(columns.map((key, index) => [key, cells[index] ?? ''])),
    }));
}

export default function AdminProductFamilyEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const call = useAdminApi();

  usePageTitle(isNew ? 'Yeni ürün ailesi' : 'Ürün ailesini düzenle');

  const [form, setForm] = useState(emptyFamily);
  const [lang, setLang] = useState('tr');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const rowImageInput = useRef(null);
  const rowImageTarget = useRef(-1);

  useEffect(() => {
    if (isNew) {
      return;
    }

    (async () => {
      try {
        const { data } = await call(getFamily, id);
        setForm({
          ...emptyFamily,
          ...data,
          i18n: Object.fromEntries(LANGUAGES.map(({ code }) => [code, { title: '', text: '', ...data.i18n?.[code] }])),
          waterTank: { ...emptyFamily.waterTank, ...data.waterTank },
          rows: (data.rows || []).map((row) => ({
            code: row.code,
            image: row.image || '',
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
    setRows((rows) => [...rows.slice(0, index + 1), { ...rows[index], values: { ...rows[index].values } }, ...rows.slice(index + 1)]);

  const removeRow = (index) => setRows((rows) => rows.filter((_, i) => i !== index));

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

  async function handleFamilyImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const url = await upload(file, 'family');
    if (url) set('image', url);
  }

  async function handleRowImage(event) {
    const file = event.target.files?.[0];
    const index = rowImageTarget.current;
    event.target.value = '';
    if (!file || index < 0) return;
    const url = await upload(file, `row-${index}`);
    if (url) setRows((rows) => rows.map((row, i) => (i === index ? { ...row, image: url } : row)));
  }

  function pickRowImage(index) {
    rowImageTarget.current = index;
    rowImageInput.current?.click();
  }

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
          <Link to="/admin/product-families" className="adminBack">← Ürün tabloları</Link>
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
                <span>Grup</span>
                <Dropdown
                  value={form.group}
                  onChange={(group) => set('group', group)}
                  label="Grup"
                  options={GROUPS.map((key) => ({ value: key, label: groupLabel(key) }))}
                />
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
              <h2>Görsel</h2>

              <div className="cmsImage">
                {form.image ? <img src={form.image} alt="" /> : <span>Görsel Yok</span>}
              </div>

              <div className="cmsRowActions">
                <label className="cmsButton">
                  {uploading === 'family' ? 'Yükleniyor…' : form.image ? 'Değiştir' : 'Görsel Yükle'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFamilyImage} disabled={Boolean(uploading)} />
                </label>
                {form.image && (
                  <button type="button" className="cmsButton cmsButtonDanger" onClick={() => set('image', '')}>Kaldır</button>
                )}
              </div>
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
                <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => setRows((rows) => [...rows, emptyRow()])}>
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

            <input ref={rowImageInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleRowImage} />

            <div className="cmsRowsTableWrap">
              <table className="cmsRowsTable">
                <thead>
                  <tr>
                    <th>#</th>
                    {columns.map((key) => (
                      <th key={key}>{columnLabel(key)}</th>
                    ))}
                    <th>Görsel</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {form.rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + 3} className="cmsMuted cmsRowsEmpty">Henüz model yok. “Satır ekle” ya da “Excel’den yapıştır” ile ekleyin.</td>
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
                          <button type="button" onClick={() => pickRowImage(index)} title="Bu modele özel görsel (boşsa ailenin görseli kullanılır)">
                            {uploading === `row-${index}` ? '…' : row.image ? <img src={row.image} alt="" /> : '+'}
                          </button>
                          {row.image && (
                            <button type="button" className="cmsRowImageRemove" onClick={() => setRows((rows) => rows.map((item, i) => (i === index ? { ...item, image: '' } : item)))} aria-label="Görseli kaldır">×</button>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="cmsRowTools">
                          <button type="button" onClick={() => moveRow(index, -1)} disabled={index === 0} aria-label="Yukarı taşı">↑</button>
                          <button type="button" onClick={() => moveRow(index, 1)} disabled={index === form.rows.length - 1} aria-label="Aşağı taşı">↓</button>
                          <button type="button" onClick={() => duplicateRow(index)} aria-label="Kopyala" title="Kopyala">⧉</button>
                          <button type="button" className="danger" onClick={() => removeRow(index)} aria-label="Sil" title="Sil">×</button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
