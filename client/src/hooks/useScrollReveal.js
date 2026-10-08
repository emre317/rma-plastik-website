import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Cards that fade up as they scroll into view
export const REVEAL_SELECTOR = [
  '.coCard', '.coFeature', '.coEcoItem', '.inSector', '.pfCard', '.productsTool', '.pmCard',
  '.pmSimilarCard', '.wtCard', '.wtUseTile', '.cmService', '.cmMachine', '.cmStep', '.cmProject',
  '.cmHomeProject', '.blogCard', '.videoCard', '.ecoBandList li',
  '.ptFamily', '.contactChannel', '.contactAddressCard', '.ecoBandPanel', '.cmCtaPanel',
].join(',');

/*
  Scroll reveal for content cards. Cards already on screen are shown at once
  (no flash after the prerendered HTML); the rest fade up when they appear.
  Nothing is hidden without JavaScript or with "reduced motion".
*/
export default function useScrollReveal() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    document.documentElement.classList.add('rv-ready');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('rv-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    const scan = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((element) => {
        if (element.dataset.rv) return;
        element.dataset.rv = '1';

        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          element.classList.add('rv', 'rv-in', 'rv-now');
          return;
        }

        // Small stagger between neighbouring cards
        const siblings = [...element.parentElement.children].filter((child) => child.matches(REVEAL_SELECTOR));
        element.style.setProperty('--rv-delay', `${(siblings.indexOf(element) % 4) * 70}ms`);
        element.classList.add('rv');
        observer.observe(element);
      });
    };

    scan();

    // Lazy pages and filtered lists add cards later
    let frame = 0;
    const mutation = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [pathname]);
}
