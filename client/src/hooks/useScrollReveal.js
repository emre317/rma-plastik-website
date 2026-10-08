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
  A card is shown as soon as its top is above the bottom of the screen, so
  cards that were jumped over (fast scrolling, End key, #anchor links) are
  never left hidden. Nothing is hidden without JavaScript or with "reduced motion".
*/
export default function useScrollReveal() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    document.documentElement.classList.add('rv-ready');

    // Hidden cards waiting to be shown. Not stored on the element: after a
    // re-run (React StrictMode, a language switch reusing the same cards)
    // every card that is still hidden is picked up again.
    const pending = new Set();

    const inReach = (element) => element.getBoundingClientRect().top < window.innerHeight * 0.94;

    const reveal = () => {
      pending.forEach((element) => {
        if (!element.isConnected) {
          pending.delete(element);
        } else if (inReach(element)) {
          element.classList.add('rv-in');
          pending.delete(element);
        }
      });
    };

    const scan = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((element) => {
        if (pending.has(element) || element.classList.contains('rv-in')) return;

        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          // On screen or already scrolled past: shown without animation
          element.classList.add('rv', 'rv-in', 'rv-now');
          return;
        }

        // Small stagger between neighbouring cards
        const siblings = [...element.parentElement.children].filter((child) => child.matches(REVEAL_SELECTOR));
        element.style.setProperty('--rv-delay', `${(siblings.indexOf(element) % 4) * 70}ms`);
        element.classList.add('rv');
        pending.add(element);
      });
    };

    // One animation frame per kind of work, so a scroll never cancels a scan
    const frames = [];
    const schedule = (slot, task) => () => {
      cancelAnimationFrame(frames[slot]);
      frames[slot] = requestAnimationFrame(task);
    };

    const onScroll = schedule(0, reveal);
    const onChange = schedule(1, () => {
      scan();
      reveal();
    });

    scan();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // Lazy pages and filtered lists add cards later
    const mutation = new MutationObserver(onChange);
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      mutation.disconnect();
      frames.forEach(cancelAnimationFrame);

      // Cards left hidden by this run are shown; the next run hides only what is below the fold
      pending.forEach((element) => element.classList.remove('rv'));
    };
  }, [pathname]);
}
