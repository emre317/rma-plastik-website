import { useTranslation } from 'react-i18next';
import { Mail, Phone } from 'lucide-react';

import ContactSection from '../../sections/ContactSection';
import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import company from '../../data/company';

export default function Contact() {
  const { t } = useTranslation();

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
    </main>
  );
}
