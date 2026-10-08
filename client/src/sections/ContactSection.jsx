import { useTranslation } from 'react-i18next';
import { FileText, Mail, MapPin, Navigation, Phone } from 'lucide-react';

import Arrow from '../components/i18n/Arrow';
import {
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from '../components/icons/SocialIcons';
import { useQuote } from '../components/quote/QuoteContext';
import company from '../data/company';
import SectionDeco from '../components/ui/SectionDeco';

/*
  Location, address and contact channels. Used on the home page and on
  the contact page; the quote form itself opens as a dialog.
*/
export default function ContactSection({ index }) {
  const { t, i18n } = useTranslation();
  const { openQuote } = useQuote();

  const channels = [
    {
      key: 'phone',
      href: company.phone.href,
      icon: Phone,
      label: t('contact.locations.phone'),
      value: company.phone.display,
      ltr: true,
    },
    {
      key: 'email',
      href: `mailto:${company.email}`,
      icon: Mail,
      label: t('contact.locations.email'),
      value: company.email,
      ltr: true,
    },
    {
      key: 'linkedin',
      href: company.social.linkedin,
      icon: LinkedinIcon,
      label: t('contact.locations.linkedin'),
      value: t('contact.locations.linkedinValue'),
      external: true,
    },
    {
      key: 'instagram',
      href: company.social.instagram,
      icon: InstagramIcon,
      label: t('contact.locations.instagram'),
      value: company.handles.instagram,
      external: true,
      ltr: true,
    },
    {
      key: 'youtube',
      href: company.social.youtube,
      icon: YoutubeIcon,
      label: t('contact.locations.youtube'),
      value: company.handles.youtube,
      external: true,
      ltr: true,
    },
  ];

  return (
    <section className="contactLocations dark" id="contact" data-track-area="contact_section">
      <SectionDeco tone="dark" ring="end" />
      <div className="container">

        <div className="contactLocationsHeader">

          <div>
            <span className="sectionIndex light">
              {index || t('contact.locations.index')}
            </span>

            <p className="eyebrow">
              {t('contact.locations.eyebrow')}
            </p>
          </div>

          <div>
            <h2>
              {t('contact.locations.title')}
              <span>{t('contact.locations.titleAccent')}</span>
            </h2>

            <p>
              {t('contact.locations.text')}
            </p>
          </div>

        </div>

        <div className="contactLocationsGrid">

          <div className="contactMap">
            <iframe
              title={t('contact.locations.mapTitle')}
              src={company.maps.embed(i18n.resolvedLanguage)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          <div className="contactLocationsSide">

            <div className="contactAddressCard">
              <span className="contactChannelsLabel">
                <MapPin aria-hidden="true" />
                {t('contact.locations.addressLabel')}
              </span>

              <address>
                <strong>{company.name}</strong>
                <span>{company.address.street}</span>
                <span>{company.address.district}</span>
                <span>{company.address.country}</span>
              </address>

              <div className="contactAddressActions">
                <a
                  href={company.maps.directions}
                  target="_blank"
                  rel="noreferrer"
                  className="contactChannel contactChannelPrimary"
                >
                  <Navigation aria-hidden="true" />
                  <span>
                    <strong>{t('contact.locations.directions')}</strong>
                  </span>
                </a>

                <a
                  href={company.maps.open}
                  target="_blank"
                  rel="noreferrer"
                  className="contactTextLink"
                >
                  {t('contact.locations.openMap')}
                  <Arrow />
                </a>
              </div>
            </div>

            <div className="contactChannels">

              <span className="contactChannelsLabel">
                {t('contact.locations.channels')}
              </span>

              {channels.map((channel) => (
                <a
                  key={channel.key}
                  href={channel.href}
                  className="contactChannel"
                  {...(channel.external
                    ? { target: '_blank', rel: 'noreferrer' }
                    : {})}
                >
                  <channel.icon aria-hidden="true" />
                  <span>
                    <small>{channel.label}</small>
                    <strong dir={channel.ltr ? 'ltr' : undefined}>
                      {channel.value}
                    </strong>
                  </span>
                  {channel.external && <Arrow />}
                </a>
              ))}

              <button
                type="button"
                className="contactChannel contactChannelOutline"
                onClick={() => openQuote()}
              >
                <FileText aria-hidden="true" />
                <span>
                  <small>{t('contact.locations.form')}</small>
                  <strong>{t('contact.locations.formValue')}</strong>
                </span>
                <Arrow />
              </button>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
