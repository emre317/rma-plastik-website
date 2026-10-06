import content from '@content';

/* Published blog posts from the content snapshot (newest first) */
const posts = Array.isArray(content.posts) ? content.posts : [];

/* Languages a post exists in: needs a title and a body (body is pre-rendered HTML) */
export const postLanguages = (post) =>
  ['tr', 'en', 'ar'].filter((lang) => post.i18n?.[lang]?.title && post.i18n?.[lang]?.bodyHtml);

export const postsForLanguage = (lang) => posts.filter((post) => postLanguages(post).includes(lang));

export default posts;
