import { Outlet } from 'react-router-dom';

import Header from '../components/Header';
import Footer from '../components/Footer';
import { QuoteProvider } from '../components/quote/QuoteContext';
import QuoteModal from '../components/quote/QuoteModal';
import QuoteCartButton from '../components/quote/QuoteCartButton';
import FloatingContact from '../components/ui/FloatingContact';
import CookieConsent from '../components/CookieConsent';

export default function PublicLayout() {
  return (
    <QuoteProvider>
      <Header />
      <Outlet />
      <Footer />
      <FloatingContact />
      <CookieConsent />
      <QuoteCartButton />
      <QuoteModal />
    </QuoteProvider>
  );
}
