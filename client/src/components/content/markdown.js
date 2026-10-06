import { Marked } from 'marked';

/*
  Markdown -> HTML for blog posts.
  Raw HTML in the text is shown as text (never executed) and links/images
  may only point to http(s), mailto, tel or site-relative addresses.
*/

const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const safeUrl = (href = '') =>
  /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(href.trim()) ? href.trim() : '';

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html({ text }) {
      return escape(text);
    },
    link({ href, title, tokens }) {
      const url = safeUrl(href);
      const text = this.parser.parseInline(tokens);

      if (!url) {
        return text;
      }

      const external = /^https?:\/\//i.test(url);

      return `<a href="${escape(url)}"${title ? ` title="${escape(title)}"` : ''}${
        external ? ' target="_blank" rel="noopener noreferrer"' : ''
      }>${text}</a>`;
    },
    image({ href, title, text }) {
      const url = safeUrl(href);

      return url
        ? `<img src="${escape(url)}" alt="${escape(text)}"${title ? ` title="${escape(title)}"` : ''} loading="lazy" decoding="async">`
        : '';
    },
  },
});

export function renderMarkdown(source = '') {
  return marked.parse(source);
}

/* Rough reading time for the article header */
export function readingMinutes(source = '') {
  const words = source.trim().split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.round(words / 200));
}
