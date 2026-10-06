import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/* true when the visitor asked the OS for less motion (no animation library needed) */
export default function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const update = () => setReduced(media.matches);

    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}
