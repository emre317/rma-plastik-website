import { Suspense, useEffect } from 'react';
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
import CatalogGate from '../components/catalog/CatalogGate';
import useScrollReveal from '../hooks/useScrollReveal';
import { captureVisit } from '../analytics/attribution';
import { prefetchPages } from '../routes/publicPages';

/*
  Scroll reveal changes the page's cards (classes, styles). It sits inside the
  page's Suspense boundary, so it starts only after the page is hydrated.
*/
function ScrollReveal() {
  useScrollReveal();
  return null;
}

export default function PublicLayout() {
  // Remember where this visit came from (sent only with a form)
  useEffect(() => captureVisit(), []);

  // Other pages' files download in the background once this page is ready
  useEffect(() => {
    if (document.readyState === 'complete') prefetchPages();
    else window.addEventListener('load', prefetchPages, { once: true });
    return () => window.removeEventListener('load', prefetchPages);
  }, []);

  return (
    <QuoteProvider>
      <CompareProvider>
      <Header />
      {/* Page files load on demand; header and footer stay in place meanwhile */}
      <Suspense fallback={<div className="pageLoading" aria-busy="true" />}>
        <Outlet />
        <ScrollReveal />
      </Suspense>
      <Footer />
      <FloatingContact />
      <CookieConsent />
      <QuoteCartButton />
      <CompareTray />
      <QuoteModal />
      <CursorTrail />
      <CatalogGate />
      </CompareProvider>
    </QuoteProvider>
  );
}
