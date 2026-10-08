import { useTranslation } from 'react-i18next';
import { Mail, Phone } from 'lucide-react';

import ContactSection from '../../sections/ContactSection';
import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import company from '../../data/company';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import useLanguage from '../../hooks/useLanguage';
import { faqsForLanguage } from '../../data/faq';
import { FaqList } from '../Faq/Faq';

export default function Contact() {
  const { t } = useTranslation();
  const { code: lang } = useLanguage();
  const faqs = faqsForLanguage(lang);

  return (
    <main className="contactPage">
      <Seo title={t('meta.titles.contact')} description={t('meta.descriptions.contact')} breadcrumbs={[{ name: t('meta.titles.contact'), path: '/contact' }]} />

      <PageHeader
        crumbs={[{ label: t('nav.contact') }]}
        eyebrow={t('contact.eyebrow')}
        title={t('contact.title')}
        accent={t('contact.titleAccent')}
        lead={t('contact.text')}
        actions={(
          <>
            <a href={company.phone.href} className="button primary" dir="ltr">
              <span>{company.phone.display}</span>
              <Phone aria-hidden="true" className="buttonIcon" />
            </a>
            <a href={`mailto:${company.email}`} className="button ghost" dir="ltr">
              <span>{company.email}</span>
              <Mail aria-hidden="true" className="buttonIcon" />
            </a>
          </>
        )}
      />

      <ContactSection />

      {faqs.length > 0 && (
        <section className="cmBlock faqBlock contactFaq">
          <div className="container faqContainer">
            <div className="faqHead">
              <h2>{t('faq.sectionTitle')}</h2>
              {faqs.length > 5 && (
                <LocalizedLink to="/faq" className="wtTextLink">
                  {t('faq.seeAll')}
                  <Arrow />
                </LocalizedLink>
              )}
            </div>
            <FaqList items={faqs} limit={5} />
          </div>
        </section>
      )}
    </main>
  );
}
