import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { deletePost, listPosts } from '../../services/adminContentApi';

const LANGS = ['tr', 'en', 'ar'];

const formatDate = (value) =>
  value ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

function statusOf(post) {
  if (post.status !== 'published') return { label: 'Taslak', cls: 'off' };
  if (post.publishedAt && new Date(post.publishedAt) > new Date()) return { label: 'Zamanlandı', cls: 'scheduled' };
  return { label: 'Yayında', cls: 'on' };
}

export default function AdminPosts() {
  usePageTitle('Blog Yazıları');

  const call = useAdminApi();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await call(listPosts);
        setPosts(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [call]);

  async function remove(post) {
    if (!window.confirm(`"${post.i18n?.tr?.title || post.slug}" kalıcı olarak silinsin mi?`)) return;

    try {
      await call(deletePost, post._id);
      setPosts((list) => list.filter((item) => item._id !== post._id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="adminContent">
      <div className="adminPageHeader">
        <div>
          <span className="adminLabel">İÇERİK YÖNETİMİ</span>
          <h1>Blog Yazıları</h1>
        </div>
        <Link to="/admin/posts/new" className="cmsButton cmsButtonPrimary">+ Yeni yazı</Link>
      </div>

      <p className="cmsHint">
        Yazı yalnızca başlığı ve metni dolu olan dillerde yayınlanır. Değişiklikler <strong>Yayınla</strong> ile siteye yansır.
      </p>

      {error && <div className="adminInlineError">{error}</div>}

      {loading ? (
        <div className="adminLoading">Yükleniyor…</div>
      ) : posts.length === 0 ? (
        <div className="cmsEmpty"><p>Henüz yazı yok. “Yeni yazı” ile ilk yazınızı ekleyin.</p></div>
      ) : (
        <div className="cmsTable">
          <div className="cmsTableHead cmsPostRow">
            <span>Yazı</span>
            <span>Diller</span>
            <span>Tarih</span>
            <span>Durum</span>
            <span />
          </div>

          {posts.map((post) => {
            const status = statusOf(post);

            return (
              <div key={post._id} className="cmsPostRow">
                <span className="cmsProductName">
                  {post.coverImage ? <img src={post.coverImage} alt="" /> : <span className="cmsThumbEmpty" aria-hidden="true" />}
                  <span>
                    <strong>{post.i18n?.tr?.title || '(başlıksız)'}</strong>
                    <small>/blog/{post.slug}</small>
                  </span>
                </span>

                <span className="cmsLangs">
                  {LANGS.map((lang) => (
                    <span key={lang} className={post.i18n?.[lang]?.title && post.i18n?.[lang]?.body ? 'on' : ''}>
                      {lang.toUpperCase()}
                    </span>
                  ))}
                </span>

                <span className="cmsMuted">{formatDate(post.publishedAt || post.updatedAt)}</span>

                <span><span className={`cmsStatus ${status.cls}`}>{status.label}</span></span>

                <span className="cmsRowActions">
                  <Link to={`/admin/posts/${post._id}`} className="cmsButton">Düzenle</Link>
                  <button type="button" className="cmsButton cmsButtonDanger" onClick={() => remove(post)}>Sil</button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
