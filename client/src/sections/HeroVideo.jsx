import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';

import Arrow from '../components/i18n/Arrow';
import { useQuote } from '../components/quote/QuoteContext';
import { track } from '../analytics/track';
import { videoText } from '../data/videos';
import useLanguage from '../hooks/useLanguage';

const PLAYER_ORIGIN = 'https://www.youtube-nocookie.com';

/*
  Home page opening: the first video (lowest "Sıra" in the admin panel) plays
  muted, looped and full-bleed behind the company introduction.

  - The YouTube poster shows immediately (fast first paint, good LCP); the
    player loads after the page and fades in only once it is really playing,
    so a blocked or failed video never shows an error screen.
  - Browsers only allow muted autoplay; the sound button unmutes on request.
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
  const [muted, setMuted] = useState(true);
  const [poster, setPoster] = useState(`https://i.ytimg.com/vi/${video.youtubeId}/maxresdefault.jpg`);
  const [size, setSize] = useState(null);

  const title = videoText(video, lang, 'title');

  // Start the player after the page has loaded
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

  // Listen to the player: fade in when it actually plays
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

  const src =
    `${PLAYER_ORIGIN}/embed/${video.youtubeId}` +
    `?autoplay=1&mute=1&loop=1&playlist=${video.youtubeId}&controls=0&disablekb=1` +
    '&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&fs=0&enablejsapi=1';

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
            src={src}
            title={title || 'RMA Plastik'}
            allow="autoplay; encrypted-media; picture-in-picture"
            tabIndex={-1}
            onLoad={handleFrameLoad}
            style={size ? { width: `${size.width}px`, height: `${size.height}px` } : undefined}
          />
        )}
      </div>

      <div className="heroVideoShade" aria-hidden="true" />

      <div className="container heroVideoInner">
        <div className="heroTop">
          <span className="heroIndex">{t('hero.index')}</span>
          <span className="heroSince">{t('hero.since')}</span>
        </div>

        <div className="heroVideoContent">
          <p className="eyebrow">{t('hero.eyebrow')}</p>

          <h1>
            {t('hero.titleLine1')}
            <span>{t('hero.titleAccent')}</span>
            {t('hero.titleLine2')}
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
        </div>

        <div className="heroVideoBottom">
          <span className="heroVideoLabel">
            <span className="heroVideoDot" aria-hidden="true" />
            {t('hero.videoLabel')}
            {title && <span className="heroVideoTitle">· {title}</span>}
          </span>

          <div className="heroVideoControls">
            {load && (
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
            )}

            <a
              className="heroVideoYoutube"
              href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
              target="_blank"
              rel="noreferrer"
            >
              {t('hero.watchOnYoutube')}
              <Arrow />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
