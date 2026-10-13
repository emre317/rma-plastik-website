import { useEffect, useState } from 'react';

/*
  Typewriter: types each text letter by letter, waits, deletes it and goes on
  to the next one (with `loop`). Adapted from the HextaUI component for this
  project (JavaScript, plain CSS instead of Tailwind):
  - one timer at a time, always cleared (also the pause before deleting)
  - screen readers get the full list once instead of single letters
  - "reduced motion": the texts change without typing
  - `waitForBoot`: starts only after the opening logo screen has gone

    <Typewriter text={['Dikey Tanklar', 'Silo Tanklar']} loop />
*/
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useBootDone(enabled) {
  const [done, setDone] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return undefined;

    const root = document.documentElement;
    if (!root.classList.contains('booting')) {
      setDone(true);
      return undefined;
    }

    const observer = new MutationObserver(() => {
      if (!root.classList.contains('booting')) {
        setDone(true);
        observer.disconnect();
      }
    });

    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [enabled]);

  return done;
}

export function Typewriter({
  text,
  speed = 100,
  cursor = '|',
  loop = false,
  deleteSpeed = 50,
  delay = 1500,
  className = '',
  waitForBoot = false,
}) {
  const texts = (Array.isArray(text) ? text : [text]).filter(Boolean);
  const key = texts.join('\u0000');

  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [reduced, setReduced] = useState(false);
  const ready = useBootDone(waitForBoot);

  // New list (e.g. language switch): start again from the first text
  useEffect(() => {
    setIndex(0);
    setShown('');
    setDeleting(false);
  }, [key]);

  useEffect(() => setReduced(prefersReducedMotion()), []);

  const current = texts[index % Math.max(texts.length, 1)] || '';

  useEffect(() => {
    if (!ready || !current) return undefined;

    // Reduced motion: whole texts, changed after the pause
    if (reduced) {
      setShown(current);
      if (!loop || texts.length < 2) return undefined;
      const timer = setTimeout(() => setIndex((value) => (value + 1) % texts.length), delay + 1500);
      return () => clearTimeout(timer);
    }

    let wait;
    let step;

    if (!deleting && shown.length < current.length) {
      wait = speed;
      step = () => setShown(current.slice(0, shown.length + 1));
    } else if (!deleting) {
      if (!loop) return undefined;
      wait = delay;
      step = () => setDeleting(true);
    } else if (shown.length > 0) {
      wait = deleteSpeed;
      step = () => setShown(shown.slice(0, -1));
    } else {
      wait = speed;
      step = () => {
        setDeleting(false);
        setIndex((value) => (value + 1) % texts.length);
      };
    }

    const timer = setTimeout(step, wait);
    return () => clearTimeout(timer);
  }, [ready, reduced, current, shown, deleting, loop, speed, deleteSpeed, delay, texts.length]);

  return (
    <span className={`typewriter ${className}`}>
      <span className="visuallyHidden">{texts.join(', ')}</span>
      <span className="typewriterText" aria-hidden="true">{shown}</span>
      {!reduced && <span className="typewriterCursor" aria-hidden="true">{cursor}</span>}
    </span>
  );
}

export default Typewriter;
