import content from '@content';

/* Published blog posts from the content snapshot (newest first) */
const posts = Array.isArray(content.posts) ? content.posts : [];

/* Languages a post exists in: needs a title and a body (body is pre-rendered HTML) */
export const postLanguages = (post) =>
  ['tr', 'en', 'ar'].filter((lang) => post.i18n?.[lang]?.title && post.i18n?.[lang]?.bodyHtml);

export const postsForLanguage = (lang) => posts.filter((post) => postLanguages(post).includes(lang));

/* Categories among a language's posts with how many posts carry each one, in first-seen (= newest post) order */
export const categoryCountsForLanguage = (lang) => {
  const counts = new Map();

  postsForLanguage(lang).forEach((post) => {
    const category = post.i18n[lang]?.category?.trim();
    if (!category) return;
    counts.set(category, (counts.get(category) || 0) + 1);
  });

  return [...counts.entries()].map(([name, count]) => ({ name, count }));
};

/* Other posts sharing this post's category (same language), newest first */
export const relatedPostsByCategory = (post, lang, limit = 3) => {
  const category = post?.i18n?.[lang]?.category?.trim();
  if (!category) return [];

  return postsForLanguage(lang)
    .filter((item) => item.slug !== post.slug && item.i18n[lang]?.category?.trim() === category)
    .slice(0, limit);
};

export default posts;
