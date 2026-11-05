import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/*
  Resets scroll on route change (SPA navigation keeps the old position
  otherwise) and scrolls to #hash targets once the new page has rendered.
  Back/forward navigation keeps the browser's own scroll restoration.
  Language switches pass { preserveScroll: true } to stay in place.
*/
export default function ScrollToTop() {
  const { pathname, hash, state } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      const target = document.getElementById(id);

      if (target) {
        target.scrollIntoView({ behavior: 'instant' });
        return undefined;
      }

      // Lazy pages (e.g. a /kvkk#... link opened in a new tab) render the
      // target a moment later: wait for it for up to 3 seconds
      if (navigationType !== 'POP') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }

      const started = Date.now();
      const timer = window.setInterval(() => {
        const late = document.getElementById(id);

        if (late || Date.now() - started > 3000) {
          window.clearInterval(timer);
          late?.scrollIntoView({ behavior: 'instant' });
        }
      }, 100);

      return () => window.clearInterval(timer);
    }

    // Language switches keep the reader's position on the same page
    if (state?.preserveScroll) {
      return undefined;
    }

    if (navigationType !== 'POP') {
      // 'instant' overrides the global `scroll-behavior: smooth`
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    return undefined;
  }, [pathname, hash, navigationType, state]);

  return null;
}
