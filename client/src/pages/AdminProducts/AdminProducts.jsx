import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import tr from '../../i18n/locales/tr';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { deleteProduct, listProducts, updateProduct } from '../../services/adminContentApi';

const categoryLabel = (key) => tr.productsPage.filters[key] || key;

export default function AdminProducts() {
  usePageTitle('Ürünler');

  const call = useAdminApi();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const response = await call(listProducts);
      setProducts(response.data || []);
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

  async function togglePublished(product) {
    try {
      const response = await call(updateProduct, product._id, { ...product, published: !product.published });
      setProducts((list) => list.map((item) => (item._id === product._id ? response.data : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(product) {
    const name = product.i18n?.tr?.name || product.slug;

    if (!window.confirm(`"${name}" kalıcı olarak silinsin mi?`)) {
      return;
    }

    try {
      await call(deleteProduct, product._id);
      setProducts((list) => list.filter((item) => item._id !== product._id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="adminContent">

      <div className="adminPageHeader">
        <div>
          <span className="adminLabel">İÇERİK YÖNETİMİ</span>
          <h1>Ürünler</h1>
        </div>

        <Link to="/admin/products/new" className="cmsButton cmsButtonPrimary">
          + Yeni ürün
        </Link>
      </div>

      <p className="cmsHint">
        Değişiklikler kaydedildikten sonra sitede görünmesi için sol menüdeki <strong>Yayınla</strong> butonunu kullanın.
      </p>

      {error && <div className="adminInlineError">{error}</div>}

      {loading ? (
        <div className="adminLoading">Yükleniyor…</div>
      ) : products.length === 0 ? (
        <div className="cmsEmpty">
          <p>Veritabanında henüz ürün yok. Sitedeki mevcut ürünleri aktarmak için sunucuda <code>npm run seed-content</code> çalıştırın veya yeni ürün ekleyin.</p>
        </div>
      ) : (
        <div className="cmsTable">
          <div className="cmsTableHead cmsProductRow">
            <span>Sıra</span>
            <span>Ürün</span>
            <span>Kategori</span>
            <span>Durum</span>
            <span />
          </div>

          {products.map((product) => (
            <div key={product._id} className="cmsProductRow">
              <span className="cmsMuted">{product.order}</span>

              <span className="cmsProductName">
                {product.image ? (
                  <img src={product.image} alt="" />
                ) : (
                  <span className="cmsThumbEmpty" aria-hidden="true" />
                )}
                <span>
                  <strong>{product.i18n?.tr?.name || '(adsız)'}</strong>
                  <small>/{product.slug}</small>
                </span>
              </span>

              <span>{categoryLabel(product.category)}</span>

              <span>
                <button
                  type="button"
                  className={`cmsStatus ${product.published ? 'on' : 'off'}`}
                  onClick={() => togglePublished(product)}
                  title="Yayın durumunu değiştir"
                >
                  {product.published ? 'Yayında' : 'Gizli'}
                </button>
              </span>

              <span className="cmsRowActions">
                <Link to={`/admin/products/${product._id}`} className="cmsButton">Düzenle</Link>
                <button type="button" className="cmsButton cmsButtonDanger" onClick={() => remove(product)}>Sil</button>
              </span>
            </div>
          ))}
        </div>
      )}

    </section>
  );
}
