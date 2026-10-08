import { Outlet } from 'react-router-dom';

import Header from '../components/Header';
import Footer from '../components/Footer';
import { QuoteProvider } from '../components/quote/QuoteContext';
import QuoteModal from '../components/quote/QuoteModal';
import QuoteCartButton from '../components/quote/QuoteCartButton';
import { CompareProvider } from '../components/compare/CompareContext';
import CompareTray from '../components/compare/CompareTray';
import FloatingContact from '../components/ui/FloatingContact';
import CookieConsent from '../components/CookieConsent';
import CursorTrail from '../components/ui/CursorTrail';
import useScrollReveal from '../hooks/useScrollReveal';

export default function PublicLayout() {
  useScrollReveal();

  return (
    <QuoteProvider>
      <CompareProvider>
      <Header />
      <Outlet />
      <Footer />
      <FloatingContact />
      <CookieConsent />
      <QuoteCartButton />
      <CompareTray />
      <QuoteModal />
      <CursorTrail />
      </CompareProvider>
    </QuoteProvider>
  );
}
