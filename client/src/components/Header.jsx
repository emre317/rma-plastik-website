import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <>
      <header className="siteHeader">
        <div className="container headerInner">

          <Link to="/" className="brand" onClick={closeMenu}>
            <span className="brandMain">RMA</span>
            <span className="brandSub">PLASTIK</span>
          </Link>

          <nav className="desktopNav">
            <NavLink to="/company">
              Company
            </NavLink>

            <NavLink to="/products">
              Products
            </NavLink>

            <NavLink to="/technologies">
              Technologies
            </NavLink>

            <NavLink to="/industries">
              Industries
            </NavLink>

            <NavLink to="/engineering">
              Engineering
            </NavLink>
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
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              type="button"
            >
              <span />
              <span />
            </button>

          </div>

        </div>
      </header>

      <div className={`mobileMenu ${menuOpen ? 'open' : ''}`}>

        <div className="container mobileMenuInner">

          <div className="mobileMenuTop">
            <span>Navigation</span>
            <span>RMA</span>
          </div>

          <nav className="mobileNav">

            <Link to="/company" onClick={closeMenu}>
              <span>01</span>
              Company
            </Link>

            <Link to="/products" onClick={closeMenu}>
              <span>02</span>
              Products
            </Link>

            <Link to="/technologies" onClick={closeMenu}>
              <span>03</span>
              Technologies
            </Link>

            <Link to="/industries" onClick={closeMenu}>
              <span>04</span>
              Industries
            </Link>

            <Link to="/engineering" onClick={closeMenu}>
              <span>05</span>
              Engineering
            </Link>

            <Link to="/contact" onClick={closeMenu}>
              <span>06</span>
              Contact
            </Link>

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