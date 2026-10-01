import { useTranslation } from 'react-i18next';

import ContactSection from '../../sections/ContactSection';
import usePageTitle from '../../hooks/usePageTitle';

export default function Contact() {
  const { t } = useTranslation();

  usePageTitle(t('meta.titles.contact'));

  const meta = t('contact.meta', { returnObjects: true });

  return (
    <main className="contactPage">

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
