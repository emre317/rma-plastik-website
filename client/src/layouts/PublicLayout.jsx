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

export default function PublicLayout() {
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
      </CompareProvider>
    </QuoteProvider>
  );
}
