import { useTranslation } from 'react-i18next';

import { LocalizedLink } from './i18n/LocalizedLink';
import Arrow from './i18n/Arrow';

const footerLinks = [
  {
    group: 'company',
    links: [
      { key: 'about', path: '/company' },
      { key: 'facilities', path: '/company' },
      { key: 'quality', path: '/company' },
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
      { key: 'engineering', path: '/engineering' },
    ],
  },
];

export default function Footer() {
  const { t } = useTranslation();

  const address = t('footer.address', { returnObjects: true });

  return (
    <footer className="siteFooter">
      <div className="container">

        <div className="footerTop">

          <div className="footerBrand">

            <LocalizedLink to="/" className="footerLogo">
              <span>RMA</span>
              <small>PLASTIK</small>
            </LocalizedLink>

            <p>
              {t('footer.description')}
            </p>

          </div>

          <div className="footerNavigation">

            {footerLinks.map((group) => (
              <div
                className="footerLinkGroup"
                key={group.group}
              >

                <span className="footerGroupTitle">
                  {t(`footer.groups.${group.group}`)}
                </span>

                <nav aria-label={t(`footer.groups.${group.group}`)}>
                  {group.links.map((link) => (
                    <LocalizedLink
                      to={link.path}
                      key={link.key}
                    >
                      {t(`footer.links.${link.key}`)}
                    </LocalizedLink>
                  ))}
                </nav>

              </div>
            ))}

          </div>

          <div className="footerContact">

            <span className="footerGroupTitle">
              {t('footer.groups.contact')}
            </span>

            <a href="mailto:info@rmaplastik.com" dir="ltr">
              info@rmaplastik.com
            </a>

            <p>
              {address.map((line, index) => (
                <span key={line}>
                  {index > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>

            <a
              href="https://www.linkedin.com/company/rmaplastik/"
              target="_blank"
              rel="noreferrer"
              className="footerLinkedin"
            >
              {t('footer.linkedin')}
              <Arrow />
            </a>

          </div>

        </div>

        <div className="footerMiddle" dir="ltr">

          <div className="footerWordmark">
            RMA
          </div>

          <span className="footerWordmarkSub">
            PLASTIK
          </span>

        </div>

        <div className="footerBottom">

          <span>
            © {new Date().getFullYear()} RMA Plastik
          </span>

          <div>
            {/* TODO: add Privacy / KVKK and Cookies pages once legal texts are approved */}
            <LocalizedLink to="/products">
              {t('footer.links.products')}
            </LocalizedLink>

            <LocalizedLink to="/contact">
              {t('footer.links.requestQuote')}
            </LocalizedLink>
          </div>

          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: 'smooth',
              })
            }
          >
            {t('footer.backToTop')} <Arrow direction="up" />
          </button>

        </div>

      </div>
    </footer>
  );
}
