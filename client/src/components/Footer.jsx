import { useTranslation } from 'react-i18next';
import { Mail, MapPin } from 'lucide-react';

import { LocalizedLink } from './i18n/LocalizedLink';
import LanguageSwitcher from './i18n/LanguageSwitcher';
import BrandLogo from './BrandLogo';

/*
  Layout follows the "footer-4" block: brand column (logo, text, social
  buttons) + four link columns, a separator, then copyright and the
  language switcher.
*/

const CONTACT_EMAIL = 'info@rmaplastik.com';
const LINKEDIN_URL = 'https://www.linkedin.com/company/rmaplastik/';

const linkColumns = [
  {
    group: 'company',
    links: [
      { key: 'about', path: '/company' },
      { key: 'facilities', path: '/company' },
      { key: 'quality', path: '/company' },
      { key: 'engineering', path: '/engineering' },
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
  {
    group: 'capabilities',
    links: [
      { key: 'rotational', path: '/technologies/rotational-moulding' },
      { key: 'injection', path: '/technologies/injection-moulding' },
      { key: 'blow', path: '/technologies/blow-moulding' },
    ],
  },
];

// Brand mark inlined: lucide-react no longer ships brand logos
function LinkedinMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.3362 18.339H15.6707V14.1622C15.6707 13.1662 15.6505 11.8845 14.2817 11.8845C12.892 11.8845 12.6797 12.9683 12.6797 14.0887V18.339H10.0142V9.75H12.5747V10.9207H12.6092C12.967 10.2457 13.837 9.53325 15.1367 9.53325C17.8375 9.53325 18.337 11.3108 18.337 13.6245V18.339H18.3362ZM7.00373 8.57475C6.14573 8.57475 5.45648 7.88025 5.45648 7.026C5.45648 6.1725 6.14648 5.47875 7.00373 5.47875C7.85873 5.47875 8.55173 6.1725 8.55173 7.026C8.55173 7.88025 7.85798 8.57475 7.00373 8.57475ZM8.34023 18.339H5.66723V9.75H8.34023V18.339ZM19.6697 3H4.32923C3.59498 3 3.00098 3.5805 3.00098 4.29675V19.7033C3.00098 20.4202 3.59498 21 4.32923 21H19.6675C20.401 21 21.001 20.4202 21.001 19.7033V4.29675C21.001 3.5805 20.401 3 19.6675 3H19.6697Z" />
    </svg>
  );
}

export default function Footer() {
  const { t } = useTranslation();

  const socials = [
    {
      key: 'linkedin',
      href: LINKEDIN_URL,
      label: t('footer.social.linkedin'),
      icon: LinkedinMark,
      external: true,
    },
    {
      key: 'email',
      href: `mailto:${CONTACT_EMAIL}`,
      label: t('footer.social.email'),
      icon: Mail,
    },
  ];

  return (
    <footer className="siteFooter">
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

          <div className="footerColumn">
            <h3>
              {t('footer.groups.contact')}
            </h3>

            <ul>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr">
                  {CONTACT_EMAIL}
                </a>
              </li>

              <li className="footerAddress">
                <MapPin className="footerIcon" aria-hidden="true" />
                <span>{t('footer.addressLine')}</span>
              </li>

              <li>
                <LocalizedLink to="/contact">
                  {t('footer.links.requestQuote')}
                </LocalizedLink>
              </li>
            </ul>
          </div>

        </div>

        <hr className="footerSeparator" />

        <div className="footerBottom">

          <p>
            © {new Date().getFullYear()} RMA Plastik. {t('footer.rights')}
          </p>

          <LanguageSwitcher placement="top" className="footerLanguage" />

        </div>

      </div>
    </footer>
  );
}
