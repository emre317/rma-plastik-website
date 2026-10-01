import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Company', path: '/company' },
  { label: 'Products', path: '/products' },
  { label: 'Technologies', path: '/technologies' },
  { label: 'Industries', path: '/industries' },
  { label: 'Engineering', path: '/engineering' },
];

const mobileNavItems = [
  ...navItems,
  { label: 'Contact', path: '/contact' },
];

export default function Header() {
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

          <Link to="/" className="brand" onClick={closeMenu}>
            <span className="brandMain">RMA</span>
            <span className="brandSub">PLASTIK</span>
          </Link>

          <nav className="desktopNav" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink to={item.path} key={item.path}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="headerActions">

            <button
              className="languageButton"
              type="button"
            >
              EN
            </button>

            <Link
              to="/contact"
              className="headerContact"
            >
              Contact
              <span>↗</span>
            </Link>

            <button
              className={`menuButton ${menuOpen ? 'active' : ''}`}
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
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
            <span>Navigation</span>
            <span>RMA</span>
          </div>

          <nav className="mobileNav" aria-label="Mobile navigation">
            {mobileNavItems.map((item, index) => (
              <NavLink
                to={item.path}
                key={item.path}
                onClick={closeMenu}
              >
                <span>
                  {String(index + 1).padStart(2, '0')}
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mobileMenuBottom">
            <span>Mersin / Istanbul</span>
            <span>Türkiye</span>
          </div>

        </div>

      </div>
    </>
  );
}
