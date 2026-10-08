import content from '@content';

/*
  FAQ (Sık sorulan sorular) managed in the admin panel. There are no built-in
  answers: the page and its links only appear once questions are published.
  Item: { topic, i18n: { tr|en|ar: { question, answer } } }
*/

// Same list as server/models/Faq.js (labels: faq.topics.*)
export const FAQ_TOPICS = ['delivery', 'installation', 'colours', 'uv', 'warranty', 'products', 'order', 'general'];

const faqs = Array.isArray(content.faqs) ? content.faqs : [];

/* Questions written in this language (no fallback: a Turkish answer is not shown on the English site) */
export function faqsForLanguage(lang) {
  return faqs
    .map((faq) => ({ topic: faq.topic, question: faq.i18n?.[lang]?.question || '', answer: faq.i18n?.[lang]?.answer || '' }))
    .filter((faq) => faq.question && faq.answer);
}

export default faqs;
