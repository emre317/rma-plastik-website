import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Globe2, MapPin, Pause, Play, Volume2, VolumeX, X } from 'lucide-react';

import Arrow from '../components/i18n/Arrow';
import { LocalizedLink } from '../components/i18n/LocalizedLink';
import { useQuote } from '../components/quote/QuoteContext';
import { track } from '../analytics/track';
import { videoText } from '../data/videos';
import useLanguage from '../hooks/useLanguage';
import portfolio from '../data/productPortfolio';
import { EcoBadge } from '../components/ui/EcoMarks';

const PLAYER_ORIGIN = 'https://www.youtube-nocookie.com';

// Product groups shown in the moving band (same groups as the 04 / Ürünler portfolio)

/*
  Home page opening: the first video (lowest "Sıra" in the admin panel) plays
  muted, looped and full-bleed behind the company introduction.

  - The YouTube poster shows immediately (fast first paint, good LCP); the
    player loads after the page and fades in only once it is really playing,
    so a blocked or failed video never shows an error screen.
  - Browsers only allow muted autoplay; "Tanıtım filmini izle" opens the film
    with sound in a lightbox, the sound button unmutes the background.
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
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [film, setFilm] = useState(false);
  const [poster, setPoster] = useState(`https://i.ytimg.com/vi/${video.youtubeId}/maxresdefault.jpg`);
  const [size, setSize] = useState(null);

  const title = videoText(video, lang, 'title');
  const stats = t('stats.items', { returnObjects: true });
  const figures = t('global.figures', { returnObjects: true });
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

      if (state === 1) {
        setPlaying(true);
      }
    }

    window.addEventListener('message', onMessage);

    return () => window.removeEventListener('message', onMessage);
  }, [load]);

  // Lightbox: Escape closes, page does not scroll behind it
  useEffect(() => {
    if (!film) {
      return undefined;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event) => event.key === 'Escape' && closeFilm();
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film]);

  function command(func, args = []) {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), PLAYER_ORIGIN);
  }

  function handleFrameLoad() {
    // Ask the player to report its state changes
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'rma-hero', channel: 'widget' }), PLAYER_ORIGIN);
  }

  function toggleSound() {
    if (muted) {
      command('unMute');
      command('setVolume', [100]);
      track('video_play', { video_id: video.youtubeId, video_title: title, placement: 'home_hero_sound_on' });
    } else {
      command('mute');
    }

    setMuted((value) => !value);
  }

  function togglePause() {
    command(paused ? 'playVideo' : 'pauseVideo');
    setPaused((value) => !value);
  }

  function openFilm() {
    command('pauseVideo');
    setFilm(true);
    track('video_play', { video_id: video.youtubeId, video_title: title, placement: 'home_hero_film' });
  }

  function closeFilm() {
    setFilm(false);

    if (!paused) {
      command('playVideo');
    }
  }

  const backgroundSrc =
    `${PLAYER_ORIGIN}/embed/${video.youtubeId}` +
    `?autoplay=1&mute=1&loop=1&playlist=${video.youtubeId}&controls=0&disablekb=1` +
    '&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&fs=0&enablejsapi=1';

  const filmSrc = `${PLAYER_ORIGIN}/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

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
        <div className="heroTop">
          <span className="heroIndex">{t('hero.index')}</span>
          <span className="heroTopRight">
            <EcoBadge type="solar" tone="glass" />
            <span className="heroSince">{t('hero.since')}</span>
          </span>
        </div>

        <div className="heroVideoGrid">
          <div className="heroVideoContent">
            <p className="heroVideoEyebrow">
              <span aria-hidden="true" />
              {t('hero.eyebrow')}
            </p>

            <h1>
              <span className="heroLine">{t('hero.titleLine1')}</span>
              <span className="heroLine heroLineAccent">{t('hero.titleAccent')}</span>
              <span className="heroLine">{t('hero.titleLine2')}</span>
            </h1>

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

            {Array.isArray(figures) && figures.length >= 3 && (
              <ul className="heroVideoTrust">
                <li>
                  <Globe2 aria-hidden="true" />
                  <span><strong>{figures[1].value}</strong> {figures[1].label}</span>
                </li>
                <li>
                  <MapPin aria-hidden="true" />
                  <span><strong>{figures[2].value}</strong> · {figures[2].label}</span>
                </li>
              </ul>
            )}
          </div>

          <aside className="heroVideoPanel">
            <button type="button" className="heroFilmCard" onClick={openFilm}>
              <span className="heroFilmThumb">
                <img src={poster} alt="" loading="lazy" decoding="async" />
                <span className="heroFilmPlay" aria-hidden="true"><Play /></span>
              </span>

              <span className="heroFilmText">
                <small>{t('hero.videoLabel')}</small>
                <strong>{t('hero.watchFilm')}</strong>
                {title && <span>{title}</span>}
              </span>
            </button>

            {Array.isArray(stats) && (
              <dl className="heroVideoStats">
                {stats.slice(0, 4).map((item) => (
                  <div key={item.label}>
                    <dt>{item.value}</dt>
                    <dd>{item.label}</dd>
                  </div>
                ))}
              </dl>
            )}
          </aside>
        </div>

        <div className="heroVideoBottom">
          <span className="heroVideoLabel">
            <span className="heroVideoDot" aria-hidden="true" />
            {t('hero.videoLabel')}
            {title && <span className="heroVideoTitle">· {title}</span>}
          </span>

          {load && (
            <div className="heroVideoControls">
              <button
                type="button"
                className="heroVideoIconButton"
                onClick={togglePause}
                disabled={!playing}
                aria-label={paused ? t('hero.play') : t('hero.pause')}
                title={paused ? t('hero.play') : t('hero.pause')}
              >
                {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
              </button>

              <button
                type="button"
                className="heroVideoSound"
                onClick={toggleSound}
                aria-pressed={!muted}
                disabled={!playing}
              >
                {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                <span>{muted ? t('hero.soundOn') : t('hero.soundOff')}</span>
              </button>
            </div>
          )}

          <a className="heroVideoScroll" href="#products">
            <span className="heroVideoMouse" aria-hidden="true"><span /></span>
            {t('hero.scroll')}
          </a>
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

      {/* Rendered at <body> level so it covers the fixed header and contact bubbles */}
      {film && createPortal(
        <div className="heroFilm" role="dialog" aria-modal="true" aria-label={title || t('hero.videoLabel')}>
          <div className="heroFilmBackdrop" onClick={closeFilm} />

          <div className="heroFilmDialog">
            <button type="button" className="heroFilmClose" onClick={closeFilm} aria-label={t('hero.close')} autoFocus>
              <X aria-hidden="true" />
            </button>

            <div className="heroFilmPlayer">
              <iframe
                src={filmSrc}
                title={title || 'RMA Plastik'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="heroFilmFooter">
              <strong>{title}</strong>
              <a href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noreferrer">
                {t('hero.watchOnYoutube')}
                <Arrow />
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
