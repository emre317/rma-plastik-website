import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Arrow from '../components/i18n/Arrow';
import { LocalizedLink } from '../components/i18n/LocalizedLink';
import { useQuote } from '../components/quote/QuoteContext';
import { videoText } from '../data/videos';
import useLanguage from '../hooks/useLanguage';
import portfolio from '../data/productPortfolio';
import HeroTitle from '../components/ui/HeroTitle';
import HeroBrand from '../components/ui/HeroBrand';
import HeroTypeLine from '../components/ui/HeroTypeLine';

const PLAYER_ORIGIN = 'https://www.youtube-nocookie.com';


// Product groups shown in the moving band (same groups as the 04 / Ürünler portfolio)

/*
  Home page opening: the first video (lowest "Sıra" in the admin panel) plays
  muted, looped and full-bleed behind the company introduction.

  - The YouTube poster shows immediately (fast first paint, good LCP); the
    player loads after the page and fades in only once it is really playing,
    so a blocked or failed video never shows an error screen.
  - Browsers only allow muted autoplay: the background film stays muted and
    has no controls (the films are on the Videolar page).
  - No autoplay for "reduced motion" or data-saver visitors (poster only).
*/
export default function HeroVideo({ video }) {
  const { t } = useTranslation();
  const { code: lang } = useLanguage();
  const { openQuote } = useQuote();

  const mediaRef = useRef(null);
  const frameRef = useRef(null);

  const [load, setLoad] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [poster, setPoster] = useState(`https://i.ytimg.com/vi/${video.youtubeId}/maxresdefault.jpg`);
  const [size, setSize] = useState(null);

  const title = videoText(video, lang, 'title');
  const categories = t('productExplorer.items', { returnObjects: true });

  // Start the background player after the page has loaded
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = navigator.connection?.saveData;

    if (reduced || saveData) {
      return undefined;
    }

    let timer;
    const start = () => {
      timer = setTimeout(() => setLoad(true), 400);
    };

    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', start);
    };
  }, []);

  // Cover the whole section with a 16:9 player (slightly enlarged to hide YouTube's edges)
  useEffect(() => {
    const element = mediaRef.current;

    if (!element || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const scale = 1.18;

      setSize(
        width / height > 16 / 9
          ? { width: width * scale, height: (width * 9 / 16) * scale }
          : { width: (height * 16 / 9) * scale, height: height * scale }
      );
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // Listen to the background player: fade in when it actually plays
  useEffect(() => {
    if (!load) {
      return undefined;
    }

    function onMessage(event) {
      if (event.origin !== PLAYER_ORIGIN || event.source !== frameRef.current?.contentWindow) {
        return;
      }

      let data;

      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      const state = data?.info?.playerState ?? (data?.event === 'onStateChange' ? data.info : undefined);

      if (state === undefined) return;

      // Shown only while it really plays: YouTube draws its own buttons when
      // the film pauses, buffers or ends, and the poster covers those moments
      setPlaying(state === 1);

      // Loop by hand (the "playlist" loop adds previous / next buttons)
      if (state === 0) {
        command('seekTo', [0, true]);
        command('playVideo');
      }
    }

    window.addEventListener('message', onMessage);

    return () => window.removeEventListener('message', onMessage);
  }, [load]);

  function command(func, args = []) {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), PLAYER_ORIGIN);
  }

  function handleFrameLoad() {
    // Ask the player to report its state changes
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'rma-hero', channel: 'widget' }), PLAYER_ORIGIN);
  }

  const backgroundSrc =
    `${PLAYER_ORIGIN}/embed/${video.youtubeId}` +
    '?autoplay=1&mute=1&controls=0&disablekb=1' +
    '&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&fs=0&enablejsapi=1';

  const band = portfolio.filter((group) => categories?.[group.id]?.label);

  return (
    <section className="heroVideo" id="home">
      <div className="heroVideoMedia" ref={mediaRef} aria-hidden="true">
        <img
          className="heroVideoPoster"
          src={poster}
          alt=""
          fetchPriority="high"
          decoding="async"
          onError={() => setPoster(`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`)}
        />

        {load && (
          <iframe
            ref={frameRef}
            className={`heroVideoFrame ${playing ? 'visible' : ''}`}
            src={backgroundSrc}
            title={title || 'RMA Plastik'}
            allow="autoplay; encrypted-media; picture-in-picture"
            tabIndex={-1}
            onLoad={handleFrameLoad}
            style={size ? { width: `${size.width}px`, height: `${size.height}px` } : undefined}
          />
        )}
      </div>

      <div className="heroVideoShade" aria-hidden="true" />
      <div className="heroVideoGrain" aria-hidden="true" />
      <div className="heroVideoGuides container" aria-hidden="true"><span /><span /><span /></div>

      <div className="container heroVideoInner">
        <div className="heroVideoGrid">
          <div className="heroVideoContent">
            <HeroBrand />

            <HeroTitle line1={t('hero.titleLine1')} accent={t('hero.titleAccent')} line2={t('hero.titleLine2')} />

            <HeroTypeLine />

            <p className="lead">{t('hero.lead')}</p>

            <div className="actions">
              <a className="button primary" href="#products">
                <span>{t('hero.exploreProducts')}</span>
                <Arrow className="buttonArrow" />
              </a>

              <button type="button" className="button ghost heroVideoGhost" onClick={() => openQuote()}>
                <span>{t('hero.requestSolution')}</span>
                <Arrow className="buttonArrow" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {band.length > 0 && (
        <nav className="heroVideoBand" aria-label={t('hero.categoriesLabel')}>
          <div className="heroVideoBandTrack">
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1 ? 'true' : undefined}>
                {band.map((group) => (
                  <li key={group.id}>
                    <LocalizedLink
                      to={group.link}
                      tabIndex={copy === 1 ? -1 : undefined}
                    >
                      {categories[group.id].label}
                    </LocalizedLink>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </nav>
      )}
    </section>
  );
}
