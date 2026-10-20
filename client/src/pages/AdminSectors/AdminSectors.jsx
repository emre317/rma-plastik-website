import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import builtInSectors from '../../data/sectors.builtin';
import { sectorIcon } from '../../data/sectorIcons';
import { deleteSector, importSectors, listSectors, updateSector } from '../../services/adminContentApi';
import { useConfirm } from '../../components/ui/ConfirmDialog';

/* Sectors (Sektörler): /industries cards and the sector pages with their products */
export default function AdminSectors() {
  usePageTitle('Sektörler');

  const call = useAdminApi();
  const confirm = useConfirm();

  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function load() {
    try {
      const { data } = await call(listSectors);
      setSectors(data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function togglePublished(sector) {
    try {
      const { data } = await call(updateSector, sector._id, { ...sector, published: !sector.published });
      setSectors((list) => list.map((item) => (item._id === sector._id ? data : item)));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function remove(sector) {
    if (!(await confirm({ title: 'Sektör silinsin mi?', message: `"${sector.i18n?.tr?.title || sector.sectorId}" sektörü ve sitedeki sektör sayfası kaldırılır.`, confirmLabel: 'Sektörü Sil', tone: 'danger' }))) return;

    try {
      await call(deleteSector, sector._id);
      setSectors((list) => list.filter((item) => item._id !== sector._id));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function importDefaults() {
    try {
      setBusy(true);
      await call(importSectors);
      setMessage({ type: 'success', text: 'Sitedeki sektörler panele aktarıldı. Artık düzenleyebilirsiniz.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="adminContent">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Katalog</span>
          <h1>Sektörler</h1>
          <p>
            Sektörler sayfasındaki kartlar ve her sektörün kendi sayfası. Sektöre ürün eklerken bir ürün grubu seçip
            ürünün o sektördeki adını yazarsınız; aynı ürün birden çok sektörde yer alabilir.
          </p>
        </div>
        {sectors.length > 0 && (
          <Link to="/admin/sectors/new" className="cmsButton cmsButtonPrimary">+ Yeni sektör</Link>
        )}
      </header>

      {message && <div className={`cmsMessage ${message.type}`}>{message.text}</div>}

      {loading ? (
        <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>
      ) : sectors.length === 0 ? (
        <div className="cmsEmpty">
          <p>
            Panelde henüz sektör yok; sitede şu an hazır {builtInSectors.length} sektör gösteriliyor.
            Düzenleyebilmek için önce panele aktarın.
          </p>
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={importDefaults} disabled={busy}>
            {busy ? 'Aktarılıyor…' : 'Sitedeki sektörleri içe aktar'}
          </button>
        </div>
      ) : (
        <div className="cmsTable">
          <div className="cmsTableHead cmsFamilyRow">
            <span>Sıra</span>
            <span>Sektör</span>
            <span>Adres</span>
            <span>Ürün</span>
            <span>Durum</span>
            <span />
          </div>

          {sectors.map((sector) => {
            const Icon = sectorIcon(sector.icon);
            const quoteItems = sector.products.filter((product) => !product.group).length;

            return (
              <div key={sector._id} className="cmsFamilyRow">
                <span className="cmsMuted">{sector.order}</span>

                <span className="cmsProductName">
                  <span className="adSectorIcon" aria-hidden="true"><Icon /></span>
                  <span>
                    <strong>{sector.i18n?.tr?.title || sector.sectorId}</strong>
                    <small>{sector.i18n?.tr?.description}</small>
                  </span>
                </span>

                <span className="cmsMuted">/industries/{sector.sectorId}</span>

                <span>
                  {sector.products.length}
                  {quoteItems > 0 && <small className="cmsMuted"> ({quoteItems} talebe göre)</small>}
                </span>

                <span>
                  <button
                    type="button"
                    className={`cmsStatus ${sector.published ? 'on' : 'off'}`}
                    onClick={() => togglePublished(sector)}
                    title="Yayın durumunu değiştir"
                  >
                    {sector.published ? 'Yayında' : 'Gizli'}
                  </button>
                </span>

                <span className="cmsRowActions">
                  <Link to={`/admin/sectors/${sector._id}`} className="cmsButton">Düzenle</Link>
                  <button type="button" className="cmsButton cmsButtonDanger" onClick={() => remove(sector)}>Sil</button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
