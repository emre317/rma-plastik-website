import { useTranslation } from 'react-i18next';
import { FileText, Mail, MessageCircle, Phone } from 'lucide-react';

import ContactSection from '../../sections/ContactSection';
import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import company from '../../data/company';

/* Quick contact card on the right of the page header */
function QuickContact() {
  const { t } = useTranslation();
  const { openQuote } = useQuote();

  const rows = [
    { key: 'phone', href: company.phone.href, icon: Phone, label: t('contact.locations.phone'), value: company.phone.display, ltr: true },
    { key: 'email', href: `mailto:${company.email}`, icon: Mail, label: t('contact.locations.email'), value: company.email, ltr: true },
    company.whatsapp && {
      key: 'whatsapp',
      href: `https://wa.me/${company.whatsapp}?text=${encodeURIComponent(t('floatingContact.whatsappMessage'))}`,
      icon: MessageCircle,
      label: 'WhatsApp',
      value: t('contact.locations.whatsappValue'),
      external: true,
    },
  ].filter(Boolean);

  return (
    <div className="ctQuick">
      <p className="ctQuickTitle">{t('contact.locations.quick')}</p>

      <ul>
        {rows.map((row) => (
          <li key={row.key}>
            <a href={row.href} className={`ctQuickRow ctQuick-${row.key}`} {...(row.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
              <span className="ctQuickIcon" aria-hidden="true"><row.icon /></span>
              <span className="ctQuickText">
                <small>{row.label}</small>
                <strong dir={row.ltr ? 'ltr' : undefined}>{row.value}</strong>
              </span>
              <Arrow className="ctQuickArrow" />
            </a>
          </li>
        ))}
      </ul>

      <button type="button" className="button primary quoteButton ctQuickQuote" onClick={() => openQuote()}>
        <FileText aria-hidden="true" className="buttonIcon" />
        <span>{t('contact.locations.form')}</span>
        <Arrow className="buttonArrow" />
      </button>
    </div>
  );
}

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
        side={<QuickContact />}
      />

      <ContactSection />
    </main>
  );
}
