import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import BrandLogo from '../BrandLogo';

const DURATION = 1500;

/*
  Brand screen shown for 1.5 s when the visitor moves to another page.
  The first page load has its own screen in index.html (shown before the
  scripts arrive). Hash links and language switches on the same page skip it.
*/
export default function PageLoader() {
  const { pathname } = useLocation();
  const page = pathname.replace(/^\/[^/]+/, '') || '/';

  const first = useRef(true);
  const [visible, setVisible] = useState(false);
  const [run, setRun] = useState(0);

  // Layout effect: the screen is up before the new page paints
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }

    setVisible(true);
    setRun((value) => value + 1);
    const timer = setTimeout(() => setVisible(false), DURATION);

    return () => clearTimeout(timer);
  }, [page]);

  return (
    <div className={`pageLoader ${visible ? 'show' : ''}`} aria-hidden="true">
      {visible && (
        <div className="pageLoaderInner" key={run}>
          <BrandLogo alt="" />
          <span className="pageLoaderBar"><i /></span>
        </div>
      )}
    </div>
  );
}
