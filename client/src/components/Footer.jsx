import { useTranslation } from 'react-i18next';
import { Mail, MapPin, Phone } from 'lucide-react';

import { LocalizedLink } from './i18n/LocalizedLink';
import LanguageSwitcher from './i18n/LanguageSwitcher';
import BrandLogo from './BrandLogo';
import {
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from './icons/SocialIcons';
import company from '../data/company';
import { useQuote } from './quote/QuoteContext';
import { openConsentSettings } from '../analytics/consent';

/*
  Layout follows the "footer-4" block: brand column (logo, text, social
  buttons) + four link columns, a separator, then copyright and the
  language switcher.
*/

const linkColumns = [
  {
    group: 'company',
    links: [
      { key: 'about', path: '/company' },
      { key: 'facilities', path: '/company' },
      { key: 'quality', path: '/company' },
      { key: 'blog', path: '/blog' },
      { key: 'videos', path: '/videos' },
    ],
  },
  {
    group: 'products',
    links: [
      { key: 'industrialTanks', path: '/products?category=industrial-tanks' },
      { key: 'chemicalTanks', path: '/products?category=chemical-tanks' },
      { key: 'waterTanks', path: '/products?category=water-tanks' },
      { key: 'agricultural', path: '/products?category=agriculture' },
      { key: 'custom', path: '/products?category=custom' },
    ],
  },
];

export default function Footer() {
  const { t } = useTranslation();
  const { openQuote } = useQuote();

  const socials = [
    {
      key: 'linkedin',
      href: company.social.linkedin,
      label: t('footer.social.linkedin'),
      icon: LinkedinIcon,
      external: true,
    },
    {
      key: 'instagram',
      href: company.social.instagram,
      label: t('footer.social.instagram'),
      icon: InstagramIcon,
      external: true,
    },
    {
      key: 'youtube',
      href: company.social.youtube,
      label: t('footer.social.youtube'),
      icon: YoutubeIcon,
      external: true,
    },
    {
      key: 'email',
      href: `mailto:${company.email}`,
      label: t('footer.social.email'),
      icon: Mail,
    },
  ];

  return (
    <footer className="siteFooter" data-track-area="footer">
      <div className="container">

        <div className="footerGrid">

          <div className="footerBrand">

            <LocalizedLink
              to="/"
              className="footerLogo"
              aria-label={t('nav.homeLink')}
            >
              <BrandLogo alt="" />
            </LocalizedLink>

            <p>
              {t('footer.description')}
            </p>

            <div className="footerSocials">
              {socials.map((social) => (
                <a
                  key={social.key}
                  href={social.href}
                  className="footerIconButton"
                  aria-label={social.label}
                  title={social.label}
                  {...(social.external
                    ? { target: '_blank', rel: 'noreferrer' }
                    : {})}
                >
                  <social.icon className="footerIcon" />
                </a>
              ))}
            </div>

          </div>

          {linkColumns.map((column) => (
            <nav
              key={column.group}
              className="footerColumn"
              aria-label={t(`footer.groups.${column.group}`)}
            >
              <h3>
                {t(`footer.groups.${column.group}`)}
              </h3>

              <ul>
                {column.links.map((link) => (
                  <li key={link.key}>
                    <LocalizedLink to={link.path}>
                      {t(`footer.links.${link.key}`)}
                    </LocalizedLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="footerColumn footerContact">
            <h3>
              {t('footer.groups.contact')}
            </h3>

            <ul>
              <li className="footerContactItem">
                <Phone className="footerIcon" aria-hidden="true" />
                <a href={company.phone.href} dir="ltr">
                  {company.phone.display}
                </a>
              </li>

              <li className="footerContactItem">
                <Mail className="footerIcon" aria-hidden="true" />
                <a href={`mailto:${company.email}`} dir="ltr">
                  {company.email}
                </a>
              </li>

              <li className="footerAddress">
                <MapPin className="footerIcon" aria-hidden="true" />
                <a href={company.maps.open} target="_blank" rel="noreferrer">
                  {company.address.street}
                  <br />
                  {company.address.district}, {company.address.country}
                </a>
              </li>

              <li>
                <button
                  type="button"
                  className="footerQuoteLink"
                  onClick={() => openQuote()}
                >
                  {t('footer.links.requestQuote')}
                </button>
              </li>
            </ul>
          </div>

        </div>

        <hr className="footerSeparator" />

        <div className="footerBottom">

          <p>
            © {new Date().getFullYear()} RMA Plastik. {t('footer.rights')}
          </p>

          <button
            type="button"
            className="footerCookieLink"
            onClick={openConsentSettings}
          >
            {t('cookies.settings')}
          </button>

          <LanguageSwitcher placement="top" className="footerLanguage" />

        </div>

      </div>
    </footer>
  );
}
