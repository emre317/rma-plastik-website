import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  LocalizedLink,
  LocalizedNavLink,
} from './i18n/LocalizedLink';
import LanguageSwitcher from './i18n/LanguageSwitcher';
import Arrow from './i18n/Arrow';

const navItems = [
  { key: 'company', path: '/company' },
  { key: 'products', path: '/products' },
  { key: 'technologies', path: '/technologies' },
  { key: 'industries', path: '/industries' },
  { key: 'engineering', path: '/engineering' },
];

const mobileNavItems = [
  ...navItems,
  { key: 'contact', path: '/contact' },
];

export default function Header() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  const closeMenu = () => {
    setMenuOpen(false);
  };

  // Close the menu whenever the route changes (incl. browser back/forward)
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock page scroll and allow Escape to close while the menu is open
  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="siteHeader">
        <div className="container headerInner">

          <LocalizedLink
            to="/"
            className="brand"
            onClick={closeMenu}
            aria-label={t('nav.homeLink')}
          >
            <span className="brandMain">RMA</span>
            <span className="brandSub">PLASTIK</span>
          </LocalizedLink>

          <nav className="desktopNav" aria-label={t('nav.main')}>
            {navItems.map((item) => (
              <LocalizedNavLink to={item.path} key={item.key}>
                {t(`nav.${item.key}`)}
              </LocalizedNavLink>
            ))}
          </nav>

          <div className="headerActions">

            <LanguageSwitcher />

            <LocalizedLink
              to="/contact"
              className="headerContact"
            >
              {t('nav.contact')}
              <Arrow />
            </LocalizedLink>

            <button
              className={`menuButton ${menuOpen ? 'active' : ''}`}
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              type="button"
            >
              <span />
              <span />
            </button>

          </div>

        </div>
      </header>

      <div
        id="mobile-menu"
        className={`mobileMenu ${menuOpen ? 'open' : ''}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >

        <div className="container mobileMenuInner">

          <div className="mobileMenuTop">
            <span>{t('nav.navigation')}</span>
            <span>RMA</span>
          </div>

          <nav className="mobileNav" aria-label={t('nav.mobile')}>
            {mobileNavItems.map((item, index) => (
              <LocalizedNavLink
                to={item.path}
                key={item.key}
                onClick={closeMenu}
              >
                <span>
                  {String(index + 1).padStart(2, '0')}
                </span>
                {t(`nav.${item.key}`)}
              </LocalizedNavLink>
            ))}
          </nav>

          <div className="mobileMenuBottom">
            <span>{t('common.locations')}</span>
            <span>{t('common.country')}</span>
          </div>

        </div>

      </div>
    </>
  );
}
