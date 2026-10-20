import { useEffect } from 'react';

const NOTICE = '.cmsMessage, .adNotice, .adminInlineError';

/*
  Admin panel: when a success or error message appears (or changes) and is
  not on screen, the page scrolls to it, so a message shown at the top of the
  page after saving further down is never missed. Smooth unless the user
  prefers reduced motion.
*/
export default function useNoticeScroll(rootSelector = '.adminPage') {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root || typeof MutationObserver === 'undefined') return undefined;

    let frame = 0;

    const reveal = (notice) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!notice.isConnected) return;
        const box = notice.getBoundingClientRect();
        const visible = box.top >= 0 && box.bottom <= window.innerHeight;
        if (visible) return;
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        notice.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
      });
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const nodes = mutation.type === 'characterData' ? [mutation.target.parentElement] : [mutation.target, ...mutation.addedNodes];
        for (const node of nodes) {
          if (!(node instanceof Element)) continue;
          const notice = node.matches(NOTICE) ? node : node.closest(NOTICE) || node.querySelector?.(NOTICE);
          if (notice) {
            reveal(notice);
            return;
          }
        }
      }
    });

    observer.observe(root, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [rootSelector]);
}
