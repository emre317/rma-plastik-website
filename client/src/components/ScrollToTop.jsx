import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/*
  Resets scroll on route change (SPA navigation keeps the old position
  otherwise) and scrolls to #hash targets once the new page has rendered.
  Back/forward navigation keeps the browser's own scroll restoration.
*/
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(
        decodeURIComponent(hash.slice(1))
      );

      if (target) {
        target.scrollIntoView({ behavior: 'instant' });
        return;
      }
    }

    if (navigationType !== 'POP') {
      // 'instant' overrides the global `scroll-behavior: smooth`
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, hash, navigationType]);

  return null;
}
