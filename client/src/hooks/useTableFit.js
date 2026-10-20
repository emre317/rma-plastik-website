import { useCallback, useRef } from 'react';

/*
  Every column of a table stays visible: when the table is wider than its box
  (many columns, a long header, a narrow screen) the box gets the class
  `cards` and the CSS shows each row as a card with labelled values instead of
  hiding columns behind a horizontal scroll. Checked again whenever the box
  changes size. Give the returned ref to the box around the table.
*/
export default function useTableFit(className = 'cards') {
  const observers = useRef(new Map());

  return useCallback((box) => {
    // Tables removed by a filter: stop watching them
    observers.current.forEach((observer, element) => {
      if (!element.isConnected) {
        observer.disconnect();
        observers.current.delete(element);
      }
    });

    if (!box || typeof ResizeObserver === 'undefined') return;
    if (observers.current.has(box)) return;

    const check = () => {
      const table = box.querySelector('table');
      if (!table) return;
      // Measured in table form; switching back and forth in the same frame does not flicker
      box.classList.remove(className);
      const tooWide = table.scrollWidth > box.clientWidth + 1;
      box.classList.toggle(className, tooWide);
    };

    const observer = new ResizeObserver(() => requestAnimationFrame(check));
    observer.observe(box);
    observers.current.set(box, observer);
    check();
  }, [className]);
}
