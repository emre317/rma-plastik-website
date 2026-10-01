import { Outlet } from 'react-router-dom';

import Header from '../components/Header';
import Footer from '../components/Footer';
import { QuoteProvider } from '../components/quote/QuoteContext';
import QuoteModal from '../components/quote/QuoteModal';

export default function PublicLayout() {
  return (
    <QuoteProvider>
      <Header />
      <Outlet />
      <Footer />
      <QuoteModal />
    </QuoteProvider>
  );
}
