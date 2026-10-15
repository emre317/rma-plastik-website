import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import Seo from '../../seo/Seo';
import { SITE_URL, absoluteUrl, OG_IMAGE } from '../../seo/site';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import YouTubeEmbed from '../../components/content/YouTubeEmbed';
import { useQuote } from '../../components/quote/QuoteContext';
import posts, { postLanguages } from '../../data/posts';
import portfolio, { LEGACY_PRODUCT_GROUPS } from '../../data/productPortfolio';
import NotFound from '../NotFound/NotFound';
import { formatPostDate } from '../Blog/Blog';

export default function BlogPost() {
  const { t } = useTranslation();
  const { lang, slug } = useParams();
  const { openQuote } = useQuote();

  const post = posts.find((item) => item.slug === slug);
  const languages = post ? postLanguages(post) : [];

  // Not published in this language -> 404 (no thin duplicate pages)
  if (!post || !languages.includes(lang)) {
    return <NotFound />;
  }

  const text = post.i18n[lang];
  // Related product groups (older posts stored generic product slugs)
  const relatedIds = [...new Set((post.relatedProducts || []).map((id) => LEGACY_PRODUCT_GROUPS[id] || id))];
  const related = relatedIds.map((id) => portfolio.find((group) => group.id === id)).filter(Boolean);
  const image = post.coverImage ? absoluteUrl(post.coverImage) : OG_IMAGE;
  const url = absoluteUrl(`/${lang}/blog/${post.slug}`);

  return (
    <main className="internalPage blogPostPage">
      <Seo
        title={text.seoTitle || text.title}
        description={text.seoDescription || text.excerpt || text.title}
        image={image}
        type="article"
        languages={languages}
        extraMeta={[
          { property: 'article:published_time', content: new Date(post.publishedAt).toISOString() },
          { property: 'article:modified_time', content: new Date(post.updatedAt || post.publishedAt).toISOString() },
        ]}
        breadcrumbs={[
          { name: t('meta.titles.blog'), path: '/blog' },
          { name: text.title, path: `/blog/${post.slug}` },
        ]}
        jsonLd={[
          {
            '@type': 'BlogPosting',
            headline: text.title,
            description: text.seoDescription || text.excerpt || '',
            image,
            datePublished: new Date(post.publishedAt).toISOString(),
            dateModified: new Date(post.updatedAt || post.publishedAt).toISOString(),
            inLanguage: lang,
            mainEntityOfPage: url,
            author: { '@id': `${SITE_URL}/#organization` },
            publisher: { '@id': `${SITE_URL}/#organization` },
          },
        ]}
      />

      <article>
        <header className="blogPostHero">
          <div className="container blogPostNarrow">
            <LocalizedLink to="/blog" className="blogBack">
              <Arrow direction="left" /> {t('blog.back')}
            </LocalizedLink>

            <p className="blogCardMeta">
              <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt, lang)}</time>
              <span>· {t('blog.readingTime', { count: text.readingMinutes || 1 })}</span>
            </p>

            <h1>{text.title}</h1>

            {text.excerpt && <p className="blogPostLead">{text.excerpt}</p>}
          </div>
        </header>

        {post.coverImage && (
          <div className="container blogPostCover">
            <img src={post.coverImage} alt="" decoding="async" />
          </div>
        )}

        <div className="container blogPostNarrow">
          <div
            className="prose"
            // Pre-rendered at build time by components/content/markdown.js (raw HTML escaped, URLs checked)
            dangerouslySetInnerHTML={{ __html: text.bodyHtml }}
          />

          {post.youtubeId && (
            <div className="blogPostVideo">
              <YouTubeEmbed id={post.youtubeId} title={text.title} />
            </div>
          )}

          {related.length > 0 && (
            <aside className="blogRelated">
              <h2>{t('blog.relatedProducts')}</h2>
              <div className="blogRelatedList">
                {related.map((group) => (
                  <LocalizedLink key={group.id} to={group.link} className="blogRelatedItem">
                    <span className="blogRelatedThumb" aria-hidden="true">
                      <img src={group.image} alt="" loading="lazy" />
                    </span>
                    <span>
                      <strong>{t(`productExplorer.items.${group.id}.title`)}</strong>
                      <small>{t(`productExplorer.items.${group.id}.application`)}</small>
                    </span>
                    <Arrow />
                  </LocalizedLink>
                ))}
              </div>
            </aside>
          )}

          <aside className="blogCta">
            <div>
              <h2>{t('blog.ctaTitle')}</h2>
              <p>{t('blog.ctaText')}</p>
            </div>
            <button type="button" className="button primary quoteButton" onClick={() => openQuote(related[0] ? t(`productExplorer.items.${related[0].id}.title`) : '')}>
              <span>{t('common.requestQuote')}</span>
              <Arrow className="buttonArrow" />
            </button>
          </aside>
        </div>
      </article>
    </main>
  );
}
