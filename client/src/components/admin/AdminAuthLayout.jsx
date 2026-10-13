import { ArrowLeft, BarChart3, FileSignature, Inbox, Table2 } from 'lucide-react';

import BrandLogo from '../BrandLogo';

// What the panel is for (shown next to the form on large screens)
const FEATURES = [
  { icon: Inbox, title: 'Teklif Talepleri', text: 'Talepleri takip edin, not ve sorumlu ekleyin.' },
  { icon: FileSignature, title: 'Proforma Fatura', text: 'Fiyatlı proformayı hazırlayıp e-postayla gönderin.' },
  { icon: BarChart3, title: 'Satış Raporu', text: 'Kanal, ülke, ürün ve kazanma oranını görün.' },
  { icon: Table2, title: 'Ürünler ve İçerik', text: 'Ürün tablolarını ve site metinlerini güncelleyin.' },
];

/*
  Frame of the admin sign-in pages (login, forgotten password, new password):
  navy brand side on large screens, the form in a card. `back` is the link
  under the card (default: back to the website).
*/
export default function AdminAuthLayout({ children, back }) {
  return (
    <main className="algPage">
      <aside className="algAside">
        <span className="algOrb one" aria-hidden="true" />
        <span className="algOrb two" aria-hidden="true" />
        <span className="algGrid" aria-hidden="true" />

        <div className="algBrand">
          <BrandLogo variant="light" alt="RMA Plastik" />
          <span>Yönetim Paneli</span>
        </div>

        <div className="algIntro">
          <h2>
            Satıştan içeriğe,
            <span>tek panelden.</span>
          </h2>

          <ul className="algFeatures">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="algFeatureIcon" aria-hidden="true"><Icon /></span>
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <small className="algCopy">© {new Date().getFullYear()} RMA Plastik</small>
      </aside>

      <section className="algMain">
        <div className="algCard">
          <div className="algCardBrand">
            <BrandLogo alt="RMA Plastik" />
          </div>

          {children}

          {back || (
            <a href="/" className="algBack">
              <ArrowLeft aria-hidden="true" />
              Siteye Dön
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
