import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, GitCompareArrows, MessageSquare, Table2, Wand2, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  LocalizedLink,
  LocalizedNavLink,
} from './i18n/LocalizedLink';
import LanguageSwitcher from './i18n/LanguageSwitcher';
import Arrow from './i18n/Arrow';
import BrandLogo from './BrandLogo';
import { useQuote } from './quote/QuoteContext';
import portfolio from '../data/productPortfolio';
import CatalogLink from './ui/CatalogLink';
import FinderCta from './ui/FinderCta';

const navItems = [
  { key: 'company', path: '/company' },
  { key: 'products', path: '/products' },
  { key: 'waterTanks', path: '/water-tanks' },
  { key: 'customMolding', path: '/custom-molding' },
  { key: 'industries', path: '/industries' },
];

const quickLinks = [
  { path: '/product-tables', label: 'meta.titles.productTables', icon: Table2 },
  { path: '/tank-finder', label: 'meta.titles.tankFinder', icon: Wand2 },
  { path: '/compare', label: 'meta.titles.compare', icon: GitCompareArrows },
  { path: '/custom-molding', label: 'nav.customMolding', icon: Wrench },
];

const mobileNavItems = [
  ...navItems,
  { key: 'contact', path: '/contact' },
];

export default function Header() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const { openQuote } = useQuote();

  const closeMenu = () => {
    setMenuOpen(false);
  };

  // Close the menus whenever the route changes (incl. browser back/forward)
  useEffect(() => {
    setMenuOpen(false);
    setProductsOpen(false);
  }, [pathname]);

  // Solid header with a shadow once the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Escape closes the products menu
  useEffect(() => {
    if (!productsOpen) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') setProductsOpen(false);
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [productsOpen]);

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
      <header className={`siteHeader ${scrolled ? 'scrolled' : ''}`}>
        <div className="container headerInner">

          <LocalizedLink
            to="/"
            className="brand"
            onClick={closeMenu}
            aria-label={t('nav.homeLink')}
          >
            <BrandLogo alt="" />
          </LocalizedLink>

          <nav className="desktopNav" aria-label={t('nav.main')}>
            {navItems.map((item) => (
              item.key === 'products' ? (
                <div
                  key={item.key}
                  className={`navDropdown ${productsOpen ? 'open' : ''}`}
                  onMouseEnter={() => setProductsOpen(true)}
                  onMouseLeave={() => setProductsOpen(false)}
                  onFocus={() => setProductsOpen(true)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setProductsOpen(false);
                  }}
                >
                  <LocalizedNavLink to={item.path} aria-haspopup="true" aria-expanded={productsOpen}>
                    {t(`nav.${item.key}`)}
                    <ChevronDown className="navCaret" aria-hidden="true" />
                  </LocalizedNavLink>

                  <div className="megaMenu" role="region" aria-label={t('nav.products')}>
                    <div className="megaMenuInner">
                      <ul className="megaGroups">
                        {portfolio.map((group) => (
                          <li key={group.id}>
                            <LocalizedLink to={group.link} onClick={() => setProductsOpen(false)}>
                              <span className="megaThumb">
                                <img src={group.image} alt="" loading="lazy" decoding="async" />
                              </span>
                              <span className="megaText">
                                <strong>{t(`productExplorer.items.${group.id}.label`)}</strong>
                                <small>
                                  {group.custom
                                    ? t('productExplorer.projectBased')
                                    : group.quoteOnly
                                      ? t('productExplorer.onRequest')
                                      : `${group.models} ${t('productExplorer.models')}`}
                                </small>
                              </span>
                            </LocalizedLink>
                          </li>
                        ))}
                      </ul>

                      <div className="megaSide">
                        <span className="megaSideLabel">{t('productExplorer.quickLinks')}</span>
                        {quickLinks.map((link) => (
                          <LocalizedLink key={link.path} to={link.path} onClick={() => setProductsOpen(false)}>
                            <link.icon aria-hidden="true" />
                            <span>{t(link.label)}</span>
                          </LocalizedLink>
                        ))}
                        <CatalogLink className="megaCatalog" placement="mega_menu" compact />
                        <LocalizedLink to="/products" className="megaAll" onClick={() => setProductsOpen(false)}>
                          {t('nav.allProducts')}
                          <Arrow />
                        </LocalizedLink>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <LocalizedNavLink to={item.path} key={item.key}>
                  {t(`nav.${item.key}`)}
                </LocalizedNavLink>
              )
            ))}
          </nav>

          <div className="headerActions">

            <LanguageSwitcher />

            <FinderCta className="headerFinder" subtitle={false} label={t('nav.finder')} />

            <LocalizedLink
              to="/contact"
              className="headerContact"
            >
              <MessageSquare aria-hidden="true" />
              {t('nav.contact')}
            </LocalizedLink>

            <button
              type="button"
              className="headerQuote"
              onClick={() => openQuote()}
            >
              {t('common.requestQuote')}
            </button>

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

          <FinderCta tone="glass" className="mobileMenuFinder" />

          <button
            type="button"
            className="mobileMenuQuote"
            onClick={() => {
              closeMenu();
              openQuote();
            }}
          >
            {t('common.requestQuote')}
            <Arrow />
          </button>

          <div className="mobileMenuBottom">
            <span>{t('common.locations')}</span>
            <span>{t('common.country')}</span>
          </div>

        </div>

      </div>
    </>
  );
}
