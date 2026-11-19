import content from '@content';

/* Published blog posts from the content snapshot (newest first) */
const posts = Array.isArray(content.posts) ? content.posts : [];

/* Languages a post exists in: needs a title and a body (body is pre-rendered HTML) */
export const postLanguages = (post) =>
  ['tr', 'en', 'ar'].filter((lang) => post.i18n?.[lang]?.title && post.i18n?.[lang]?.bodyHtml);

export const postsForLanguage = (lang) => posts.filter((post) => postLanguages(post).includes(lang));

/* Distinct categories among a language's posts, in first-seen (= newest post) order */
export const categoriesForLanguage = (lang) => {
  const seen = new Set();

  postsForLanguage(lang).forEach((post) => {
    const category = post.i18n[lang]?.category?.trim();
    if (category) seen.add(category);
  });

  return [...seen];
};

export default posts;
