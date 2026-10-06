import { useTranslation } from 'react-i18next';

import ContactSection from '../../sections/ContactSection';
import Seo from '../../seo/Seo';

export default function Contact() {
  const { t } = useTranslation();

  const meta = t('contact.meta', { returnObjects: true });

  return (
    <main className="contactPage">
      <Seo title={t('meta.titles.contact')} description={t('meta.descriptions.contact')} breadcrumbs={[{ name: t('meta.titles.contact'), path: '/contact' }]} />

      <section className="internalHero contactPageHero">
        <div className="container">

          <div className="internalHeroMeta">
            <span>{meta[0]}</span>
            <span>{meta[1]}</span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              {t('contact.eyebrow')}
            </p>

            <h1>
              {t('contact.title')}
              <span>{t('contact.titleAccent')}</span>
            </h1>

          </div>

          <div className="internalHeroBottom">

            <p>
              {t('contact.text')}
            </p>

            <span>
              {t('contact.tag')}
            </span>

          </div>

        </div>
      </section>

      <ContactSection />

    </main>
  );
}
