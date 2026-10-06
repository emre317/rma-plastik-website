import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { youtubeThumbnail } from '../../components/content/YouTubeEmbed';
import { postsForLanguage } from '../../data/posts';
import videos, { videoText } from '../../data/videos';

export function formatPostDate(date, lang) {
  if (!date) return '';

  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : lang, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export default function Blog() {
  const { t } = useTranslation();
  const { lang } = useParams();

  const posts = postsForLanguage(lang);

  return (
    <main className="internalPage blogPage">
      <Seo
        title={t('meta.titles.blog')}
        description={t('meta.descriptions.blog')}
        breadcrumbs={[{ name: t('meta.titles.blog'), path: '/blog' }]}
      />

      <PageHeader
        compact
        crumbs={[{ label: t('meta.titles.blog') }]}
        eyebrow={t('blog.eyebrow')}
        title={t('blog.title')}
        accent={t('blog.titleAccent')}
        lead={t('blog.text')}
      />

      <section className="blogListSection">
        <div className="container">
          {posts.length === 0 ? (
            <div className="blogEmpty">
              <p>{t('blog.empty')}</p>
              <LocalizedLink to="/products">
                {t('blog.emptyLink')}
                <Arrow />
              </LocalizedLink>
            </div>
          ) : (
            <div className="blogGrid">
              {posts.map((post, index) => {
                const text = post.i18n[lang];

                return (
                  <article key={post.slug} className={`blogCard ${index === 0 ? 'featured' : ''}`}>
                    <LocalizedLink to={`/blog/${post.slug}`} className="blogCardLink">
                      <div className="blogCardMedia">
                        {post.coverImage ? (
                          <img src={post.coverImage} alt="" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" />
                        ) : post.youtubeId ? (
                          <img src={youtubeThumbnail(post.youtubeId)} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <span className="blogCardPlaceholder" aria-hidden="true">RMA</span>
                        )}
                      </div>

                      <div className="blogCardBody">
                        <p className="blogCardMeta">
                          <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt, lang)}</time>
                          <span>· {t('blog.readingTime', { count: text.readingMinutes || 1 })}</span>
                        </p>

                        <h2>{text.title}</h2>

                        {text.excerpt && <p className="blogCardExcerpt">{text.excerpt}</p>}

                        <span className="blogCardMore">
                          {t('blog.readMore')}
                          <Arrow />
                        </span>
                      </div>
                    </LocalizedLink>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {videos.length > 0 && (
        <section className="blogVideosStrip">
          <div className="container">
            <div className="blogVideosHeader">
              <h2>{t('videos.title')} <span>{t('videos.titleAccent')}</span></h2>
              <LocalizedLink to="/videos" className="globalLink">
                {t('videos.all')}
                <Arrow />
              </LocalizedLink>
            </div>

            <div className="blogVideosRow">
              {videos.slice(0, 3).map((video) => (
                <LocalizedLink key={video.youtubeId} to="/videos" className="blogVideoThumb">
                  <img src={youtubeThumbnail(video.youtubeId)} alt="" loading="lazy" decoding="async" />
                  <span>{videoText(video, lang, 'title')}</span>
                </LocalizedLink>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
