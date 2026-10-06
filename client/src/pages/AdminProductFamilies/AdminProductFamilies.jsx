import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import tr from '../../i18n/locales/tr';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { deleteFamily, importFamilies, listFamilies, updateFamily } from '../../services/adminContentApi';

const groupLabel = (key) => tr.productTables.groups[key] || key;

export default function AdminProductFamilies() {
  usePageTitle('Ürün tabloları');

  const call = useAdminApi();

  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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
