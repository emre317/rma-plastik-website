import { Link } from 'react-router-dom';

const footerLinks = [
  {
    title: 'Company',
    links: [
      {
        label: 'About RMA',
        path: '/company',
      },
      {
        label: 'Production Facilities',
        path: '/company',
      },
      {
        label: 'Quality',
        path: '/company',
      },
    ],
  },

  {
    title: 'Products',
    links: [
      {
        label: 'Industrial Tanks',
        path: '/products',
      },
      {
        label: 'Chemical Tanks',
        path: '/products',
      },
      {
        label: 'Water Tanks',
        path: '/products',
      },
      {
        label: 'Agricultural Solutions',
        path: '/products',
      },
      {
        label: 'Custom Products',
        path: '/products',
      },
    ],
  },

  {
    title: 'Capabilities',
    links: [
      {
        label: 'Rotational Moulding',
        path: '/technologies/rotational-moulding',
      },
      {
        label: 'Injection Moulding',
        path: '/technologies/injection-moulding',
      },
      {
        label: 'Blow Moulding',
        path: '/technologies/blow-moulding',
      },
      {
        label: 'Engineering',
        path: '/engineering',
      },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="siteFooter">
      <div className="container">

        <div className="footerTop">

          <div className="footerBrand">

            <Link to="/" className="footerLogo">
              <span>RMA</span>
              <small>PLASTIK</small>
            </Link>

            <p>
              Industrial polyethylene manufacturing
              and engineered product solutions.
            </p>

          </div>

          <div className="footerNavigation">

            {footerLinks.map((group) => (
              <div
                className="footerLinkGroup"
                key={group.title}
              >

                <span className="footerGroupTitle">
                  {group.title}
                </span>

                <nav>
                  {group.links.map((link) => (
                    <Link
                      to={link.path}
                      key={link.label}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

              </div>
            ))}

          </div>

          <div className="footerContact">

            <span className="footerGroupTitle">
              Contact
            </span>

            <a href="mailto:info@rmaplastik.com">
              info@rmaplastik.com
            </a>

            <p>
              Mersin
              <br />
              Istanbul
              <br />
              Türkiye
            </p>

            <a
              href="https://www.linkedin.com/company/rmaplastik/"
              target="_blank"
              rel="noreferrer"
              className="footerLinkedin"
            >
              LinkedIn
              <span>↗</span>
            </a>

          </div>

        </div>

        <div className="footerMiddle">

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
            <Link to="/products">
              Products
            </Link>

            <Link to="/contact">
              Request a Quote
            </Link>
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
            Back to top ↑
          </button>

        </div>

      </div>
    </footer>
  );
}