import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Plus } from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import useLanguage from '../../hooks/useLanguage';
import { FAQ_TOPICS, faqsForLanguage } from '../../data/faq';

/* Questions as an accordion; also used on the contact page (limit) */
export function FaqList({ items, limit }) {
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <div className="faqList">
      {shown.map((item) => (
        <details key={item.question} className="faqItem">
          <summary>
            <span>{item.question}</span>
            <Plus aria-hidden="true" />
          </summary>
          <div className="faqAnswer">
            {item.answer.split(/\n{2,}/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </details>
      ))}
    </div>
  );
}

/* Sık sorulan sorular: questions from the admin panel, grouped by topic */
export default function Faq() {
  const { t } = useTranslation();
  const { code: lang } = useLanguage();
  const { openQuote } = useQuote();
  const [topic, setTopic] = useState('all');

  const items = faqsForLanguage(lang);
  const topics = FAQ_TOPICS.filter((id) => items.some((item) => item.topic === id));
  const visible = topic === 'all' ? items : items.filter((item) => item.topic === topic);

  // FAQPage rich results: every question in this language
  const jsonLd = useMemo(
    () => (items.length
      ? [{
          '@type': 'FAQPage',
          mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        }]
      : []),
    [items]
  );

  return (
    <main className="internalPage faqPage">
      <Seo
        title={t('meta.titles.faq')}
        description={t('meta.descriptions.faq')}
        breadcrumbs={[{ name: t('meta.titles.faq'), path: '/faq' }]}
        jsonLd={jsonLd}
        noindex={!items.length}
      />

      <PageHeader
        compact
        crumbs={[{ label: t('meta.titles.faq') }]}
        eyebrow={t('faq.eyebrow')}
        title={t('faq.title')}
        accent={t('faq.titleAccent')}
        lead={t('faq.lead')}
      />

      <section className="cmBlock faqBlock">
        <div className="container faqContainer">
          {items.length ? (
            <>
              {topics.length > 1 && (
                <div className="faqTopics" role="group" aria-label={t('faq.eyebrow')}>
                  {['all', ...topics].map((id) => (
                    <button key={id} type="button" className={topic === id ? 'active' : ''} aria-pressed={topic === id} onClick={() => setTopic(id)}>
                      {id === 'all' ? t('faq.all') : t(`faq.topics.${id}`)}
                    </button>
                  ))}
                </div>
              )}

              {topic === 'all' && topics.length > 1 ? (
                topics.map((id) => (
                  <div key={id} className="faqGroup">
                    <h2>{t(`faq.topics.${id}`)}</h2>
                    <FaqList items={items.filter((item) => item.topic === id)} />
                  </div>
                ))
              ) : (
                <FaqList items={visible} />
              )}
            </>
          ) : (
            <div className="faqEmpty">
              <h2>{t('faq.emptyTitle')}</h2>
              <p>{t('faq.emptyText')}</p>
            </div>
          )}
        </div>
      </section>

      <section className="cmCta">
        <div className="container">
          <div className="cmCtaPanel">
            <div>
              <h2>{t('faq.ctaTitle')}</h2>
              <p>{t('faq.ctaText')}</p>
            </div>

            <div className="cmCtaActions">
              <button type="button" className="button primary" onClick={() => openQuote()}>
                <span>{t('common.requestQuote')}</span>
                <Arrow className="buttonArrow" />
              </button>
              <LocalizedLink to="/contact" className="cmCtaLink">
                <MessageSquare aria-hidden="true" />
                {t('pages.customMolding.ctaContact')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
