import { useTranslation } from 'react-i18next';
import { MapPin, Navigation } from 'lucide-react';

import Arrow from '../components/i18n/Arrow';
import {
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from '../components/icons/SocialIcons';
import company from '../data/company';

/*
  Contact page body: the map on one side, the plant address with directions
  and the social channels on the other (phone, e-mail and WhatsApp sit in
  the page header).
*/
export default function ContactSection() {
  const { t, i18n } = useTranslation();

  const socials = [
    { key: 'linkedin', href: company.social.linkedin, icon: LinkedinIcon, label: t('contact.locations.linkedin'), value: t('contact.locations.linkedinValue') },
    { key: 'instagram', href: company.social.instagram, icon: InstagramIcon, label: t('contact.locations.instagram'), value: company.handles.instagram, ltr: true },
    { key: 'youtube', href: company.social.youtube, icon: YoutubeIcon, label: t('contact.locations.youtube'), value: company.handles.youtube, ltr: true },
  ];

  return (
    <section className="ctMain" id="contact" data-track-area="contact_section">
      <div className="container ctGrid">
        <div className="ctMap">
          <iframe
            title={t('contact.locations.mapTitle')}
            src={company.maps.embed(i18n.resolvedLanguage)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>

        <div className="ctInfo">
          <div className="ctCard">
            <p className="eyebrow">{t('contact.locations.eyebrow')}</p>
            <h2>
              {t('contact.locations.title')}
              <span>{t('contact.locations.titleAccent')}</span>
            </h2>
            <p className="ctCardText">{t('contact.locations.text')}</p>

            <address className="ctAddress">
              <MapPin aria-hidden="true" />
              <span>
                <strong>{company.name}</strong>
                {company.address.street}
                <br />
                {company.address.district}, {company.address.country}
              </span>
            </address>

            <div className="ctCardActions">
              <a href={company.maps.directions} target="_blank" rel="noreferrer" className="button primary">
                <Navigation aria-hidden="true" className="buttonIcon" />
                <span>{t('contact.locations.directions')}</span>
              </a>
              <a href={company.maps.open} target="_blank" rel="noreferrer" className="ctTextLink">
                {t('contact.locations.openMap')}
                <Arrow />
              </a>
            </div>
          </div>

          <div className="ctCard ctSocial">
            <p className="ctSocialTitle">{t('contact.locations.follow')}</p>
            <ul>
              {socials.map((item) => (
                <li key={item.key}>
                  <a href={item.href} target="_blank" rel="noreferrer">
                    <span className="ctSocialIcon" aria-hidden="true"><item.icon /></span>
                    <span>
                      <small>{item.label}</small>
                      <strong dir={item.ltr ? 'ltr' : undefined}>{item.value}</strong>
                    </span>
                    <Arrow className="ctSocialArrow" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
