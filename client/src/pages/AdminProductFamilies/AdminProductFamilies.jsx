import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import tr from '../../i18n/locales/tr';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { createFamily, deleteFamily, importFamilies, listFamilies, updateFamily } from '../../services/adminContentApi';
import { exportFamilies, readFamiliesFile } from './familyExcel';

const groupLabel = (key) => tr.productTables.groups[key] || key;

export default function AdminProductFamilies() {
  usePageTitle('Ürün tabloları');

  const call = useAdminApi();

  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [excelBusy, setExcelBusy] = useState('');
  const [preview, setPreview] = useState(null);
  const fileInput = useRef(null);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const response = await call(listFamilies);
      setFamilies(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function importDefaults() {
    try {
      setImporting(true);
      setError('');
      const response = await call(importFamilies);
      setNotice(`${response.imported} ürün ailesi broşürden aktarıldı. Sitede görünmesi için “Yayınla”ya basın.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  async function togglePublished(family) {
    try {
      const response = await call(updateFamily, family._id, { ...family, published: !family.published });
      setFamilies((list) => list.map((item) => (item._id === family._id ? response.data : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(family) {
    const name = family.i18n?.tr?.title || family.familyId;

    if (!window.confirm(`"${name}" ve tablosundaki ${family.rows.length} model kalıcı olarak silinsin mi?`)) {
      return;
    }

    try {
      await call(deleteFamily, family._id);
      setFamilies((list) => list.filter((item) => item._id !== family._id));
    } catch (err) {
      setError(err.message);
    }
  }

  const totalRows = families.reduce((sum, family) => sum + family.rows.length, 0);

  async function downloadExcel() {
    try {
      setExcelBusy('export');
      setError('');
      const count = await exportFamilies(families);
      setNotice(`${count} model Excel dosyasına aktarıldı.`);
    } catch (err) {
      setError(`Excel dosyası oluşturulamadı: ${err.message}`);
    } finally {
      setExcelBusy('');
    }
  }

  async function readExcel(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setExcelBusy('read');
      setError('');
      setNotice('');
      setPreview(await readFamiliesFile(file, families));
    } catch (err) {
      setError(`Dosya okunamadı: ${err.message}`);
    } finally {
      setExcelBusy('');
    }
  }

  async function applyExcel() {
    const steps = preview.plan.filter((item) => !item.skip && !item.unchanged);
    let done = 0;

    try {
      setExcelBusy('apply');
      setError('');

      for (const item of steps) {
        if (item.existing) {
          await call(updateFamily, item.existing._id, { ...item.existing, columns: item.columns, rows: item.rows });
        } else {
          await call(createFamily, {
            familyId: item.familyId,
            group: 'other',
            order: 1000,
            published: false,
            columns: item.columns,
            rows: item.rows,
            i18n: { tr: { title: item.title, text: '' }, en: {}, ar: {} },
          });
        }
        done += 1;
      }

      setPreview(null);
      setNotice(`${done} ürün ailesi Excel’den güncellendi. Yeni aileler “Gizli” olarak eklendi; kontrol edip yayına alın. Sitede görünmesi için “Yayınla”ya basın.`);
      await load();
    } catch (err) {
      setError(`${done}/${steps.length} aile güncellendi, sonra hata oluştu: ${err.message}`);
      await load();
    } finally {
      setExcelBusy('');
    }
  }

  return (
    <section className="adminContent">

      <div className="adminPageHeader">
        <div>
          <span className="adminLabel">İÇERİK YÖNETİMİ</span>
          <h1>Ürün tabloları</h1>
        </div>

        <Link to="/admin/product-families/new" className="cmsButton cmsButtonPrimary">
          + Yeni ürün ailesi
        </Link>
      </div>

      <p className="cmsHint">
        <strong>Ürün Tabloları</strong> ve <strong>Su Depoları</strong> sayfalarındaki modeller buradan yönetilir.
        Kaydettikten sonra sitede görünmesi için sol menüdeki <strong>Yayınla</strong> butonunu kullanın.
      </p>

      {error && <div className="adminInlineError">{error}</div>}
      {notice && <div className="cmsMessage success">{notice}</div>}

      {families.length > 0 && (
        <div className="cmsExcelBar">
          <div>
            <strong>Excel ile toplu güncelleme</strong>
            <small>Tüm modelleri indirin, Excel’de düzenleyin ve geri yükleyin. Önce değişiklikleri önizlersiniz.</small>
          </div>
          <div className="cmsRowActions">
            <button type="button" className="cmsButton" onClick={downloadExcel} disabled={Boolean(excelBusy)}>
              {excelBusy === 'export' ? 'Hazırlanıyor…' : 'Excel’e aktar'}
            </button>
            <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => fileInput.current?.click()} disabled={Boolean(excelBusy)}>
              {excelBusy === 'read' ? 'Okunuyor…' : 'Excel’den içe aktar'}
            </button>
            <input ref={fileInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={readExcel} />
          </div>
        </div>
      )}

      {preview && (
        <div className="cmsExcelPreview">
          <h2>İçe aktarma önizlemesi</h2>

          {preview.errors.length > 0 && (
            <ul className="cmsExcelErrors">
              {preview.errors.slice(0, 12).map((message) => (
                <li key={message}>{message}</li>
              ))}
              {preview.errors.length > 12 && <li>… ve {preview.errors.length - 12} uyarı daha</li>}
            </ul>
          )}

          {preview.plan.length > 0 && (
            <div className="cmsRowsTableWrap">
              <table className="cmsRowsTable">
                <thead>
                  <tr>
                    <th>Ürün ailesi</th>
                    <th>Durum</th>
                    <th>Model (önce → sonra)</th>
                    <th>Eklenen</th>
                    <th>Silinen</th>
                    <th>Değişen</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.plan.filter((item) => !item.unchanged).map((item) => (
                    <tr key={item.familyId} className={item.skip ? 'cmsMuted' : ''}>
                      <td><strong>{item.title || item.familyId}</strong> <small className="cmsMuted">{item.familyId}</small></td>
                      <td>{item.skip ? 'Atlanacak' : item.existing ? 'Güncellenecek' : 'Yeni aile (gizli)'}</td>
                      <td>{item.stats.before} → {item.stats.after}</td>
                      <td className={item.stats.added ? 'cmsPlus' : ''}>{item.stats.added || '–'}</td>
                      <td className={item.stats.removed ? 'cmsMinus' : ''}>{item.stats.removed || '–'}</td>
                      <td>{item.stats.changed || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.plan.some((item) => item.unchanged) && (
            <p className="cmsMuted">{preview.plan.filter((item) => item.unchanged).length} ürün ailesinde değişiklik yok.</p>
          )}

          <p className="cmsHint">Dosyada olmayan aileler değişmez. Modellere ait görseller ürün koduna göre korunur.</p>

          <div className="cmsRowActions">
            <button
              type="button"
              className="cmsButton cmsButtonPrimary"
              onClick={applyExcel}
              disabled={Boolean(excelBusy) || preview.plan.every((item) => item.skip || item.unchanged)}
            >
              {excelBusy === 'apply' ? 'Uygulanıyor…' : 'Uygula'}
            </button>
            <button type="button" className="cmsButton" onClick={() => setPreview(null)} disabled={excelBusy === 'apply'}>Vazgeç</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="adminLoading">Yükleniyor…</div>
      ) : families.length === 0 ? (
        <div className="cmsEmpty">
          <p>
            Veritabanında henüz ürün tablosu yok; sitede şu an broşürdeki tablolar (21 ürün ailesi, 162 model) gösteriliyor.
            Bunları düzenleyebilmek için önce panele aktarın.
          </p>
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={importDefaults} disabled={importing}>
            {importing ? 'Aktarılıyor…' : 'Broşür tablolarını içe aktar'}
          </button>
        </div>
      ) : (
        <>
          <p className="cmsMuted cmsFamilyCount">{families.length} ürün ailesi · {totalRows} model</p>

          <div className="cmsTable">
            <div className="cmsTableHead cmsFamilyRow">
              <span>Sıra</span>
              <span>Ürün ailesi</span>
              <span>Grup</span>
              <span>Model</span>
              <span>Durum</span>
              <span />
            </div>

            {families.map((family) => (
              <div key={family._id} className="cmsFamilyRow">
                <span className="cmsMuted">{family.order}</span>

                <span className="cmsProductName">
                  {family.image ? <img src={family.image} alt="" /> : <span className="cmsThumbEmpty" aria-hidden="true" />}
                  <span>
                    <strong>{family.i18n?.tr?.title || '(adsız)'}</strong>
                    <small>
                      {family.familyId}
                      {family.waterTank?.enabled && <em className="cmsBadge">Su deposu seçicide</em>}
                    </small>
                  </span>
                </span>

                <span>{groupLabel(family.group)}</span>

                <span>{family.rows.length}</span>

                <span>
                  <button
                    type="button"
                    className={`cmsStatus ${family.published ? 'on' : 'off'}`}
                    onClick={() => togglePublished(family)}
                    title="Yayın durumunu değiştir"
                  >
                    {family.published ? 'Yayında' : 'Gizli'}
                  </button>
                </span>

                <span className="cmsRowActions">
                  <Link to={`/admin/product-families/${family._id}`} className="cmsButton">Düzenle</Link>
                  <button type="button" className="cmsButton cmsButtonDanger" onClick={() => remove(family)}>Sil</button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

    </section>
  );
}
