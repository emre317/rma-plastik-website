import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { youtubeThumbnail } from '../../components/content/YouTubeEmbed';
import { categoryCountsForLanguage, postsForLanguage } from '../../data/posts';
import videos, { videoText } from '../../data/videos';

const PAGE_SIZE = 8;

function normalize(value, lang) {
  return (value || '').toLocaleLowerCase(lang === 'ar' ? 'ar' : lang).trim();
}

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
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(() => searchParams.get('category') || '');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const posts = postsForLanguage(lang);
  const categoryCounts = useMemo(() => categoryCountsForLanguage(lang), [lang]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (category) next.set('category', category);
    else next.delete('category');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const filteredPosts = useMemo(() => {
    const needle = normalize(query, lang);

    return posts.filter((post) => {
      const text = post.i18n[lang];
      if (category && text.category !== category) return false;
      if (!needle) return true;
      return normalize(text.title, lang).includes(needle) || normalize(text.excerpt, lang).includes(needle);
    });
  }, [posts, query, category, lang]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;
  const isFiltering = query.trim().length > 0 || category.length > 0;

  function handleSearchChange(event) {
    setQuery(event.target.value);
    setVisibleCount(PAGE_SIZE);
  }

  function handleCategoryChange(value) {
    setCategory((current) => (current === value ? '' : value));
    setVisibleCount(PAGE_SIZE);
  }

  function clearFilters() {
    setQuery('');
    setCategory('');
  }

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
            <>
              <div className="blogToolbar">
                <label className="blogSearch">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className="visuallyHidden">{t('blog.searchLabel')}</span>
                  <input
                    type="search"
                    value={query}
                    onChange={handleSearchChange}
                    placeholder={t('blog.searchPlaceholder')}
                    aria-label={t('blog.searchLabel')}
                  />
                </label>

                {isFiltering && (
                  <p className="blogResultsCount">
                    {t('blog.resultsCount', { count: filteredPosts.length })}
                  </p>
                )}
              </div>

              {categoryCounts.length > 0 && (
                <div className="blogCategories" role="group" aria-label={t('blog.categoriesLabel')}>
                  <button
                    type="button"
                    className={`blogCategoryPill ${category === '' ? 'active' : ''}`}
                    onClick={() => handleCategoryChange('')}
                  >
                    {t('blog.allCategories')}
                    <span className="blogCategoryCount">{posts.length}</span>
                  </button>

                  {categoryCounts.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className={`blogCategoryPill ${category === item.name ? 'active' : ''}`}
                      onClick={() => handleCategoryChange(item.name)}
                    >
                      {item.name}
                      <span className="blogCategoryCount">{item.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {filteredPosts.length === 0 ? (
                <div className="blogEmpty">
                  <p>{t('blog.noResults')}</p>
                  <button type="button" className="blogClearSearch" onClick={clearFilters}>
                    {t('blog.clearSearch')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="blogGrid">
                    {visiblePosts.map((post, index) => {
                      const text = post.i18n[lang];
                      const featured = index === 0 && !isFiltering;

                      return (
                        <article key={post.slug} className={`blogCard ${featured ? 'featured' : ''}`}>
                          <LocalizedLink to={`/blog/${post.slug}`} className="blogCardLink">
                            <div className="blogCardMedia">
                              {post.coverImage ? (
                                <img
                                  src={post.coverImage}
                                  alt=""
                                  loading={index < 2 ? 'eager' : 'lazy'}
                                  decoding="async"
                                />
                              ) : post.youtubeId ? (
                                <img src={youtubeThumbnail(post.youtubeId)} alt="" loading="lazy" decoding="async" />
                              ) : (
                                <span className="blogCardPlaceholder" aria-hidden="true">RMA</span>
                              )}
                            </div>

                            <div className="blogCardBody">
                              {text.category && <span className="blogCardCategory">{text.category}</span>}

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

                  {hasMore && (
                    <div className="blogLoadMore">
                      <button
                        type="button"
                        className="button ghost"
                        onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                      >
                        {t('blog.loadMore')}
                        <Arrow className="buttonArrow" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
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
