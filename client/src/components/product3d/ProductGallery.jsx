import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, ChevronLeft, ChevronRight, Image as ImageIcon, Maximize2, Package } from 'lucide-react';

import ImageLightbox from '../ui/ImageLightbox';
import { track } from '../../analytics/track';
import features from '../../data/features';

const loadViewer = () => import('./Photo3DViewer');
const Photo3DViewer = lazy(loadViewer);
const preloadViewer = () => {
  loadViewer().catch(() => {});
};

const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/*
  Product photos on the model page:
  - photo mode: large photo (hover magnifier, click for full screen), arrows,
    swipe, counter and thumbnails;
  - 3D mode: the selected photo as an interactive 3D relief (Photo3DViewer,
    loaded only when chosen).
  Magnifier / full screen and 3D follow data/features.js (Site Ayarları);
  when off, the gallery is a plain photo viewer with arrows and thumbnails.
  images: [src] cover first; tag / code: labels on the photo.
*/
export default function ProductGallery({ images, alt = '', tag = '', code = '' }) {
  const { t } = useTranslation();
  const g = (key, options) => t(`gallery3d.${key}`, options);

  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState('photo');
  const [viewer, setViewer] = useState(-1);
  const [zoom, setZoom] = useState(null);
  const [no3d, setNo3d] = useState(false);
  const swipe = useRef(null);
  const thumbsRef = useRef(null);

  const zoomOn = features.productZoom;
  const show3d = features.product3d && !no3d;

  const count = images.length;
  const current = images[Math.min(index, count - 1)] || '';

  // Another model page: back to its first photo
  useEffect(() => {
    setIndex(0);
    setMode('photo');
    setZoom(null);
  }, [images]);

  // The active thumbnail stays in view
  useEffect(() => {
    thumbsRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [index, mode]);

  const go = useCallback((delta) => {
    if (count < 2) return;
    setZoom(null);
    setIndex((value) => (value + delta + count) % count);
  }, [count]);

  const choose = (i) => {
    setIndex(i);
    setZoom(null);
  };

  const open3d = () => {
    setMode('3d');
    track('product_3d_open', { code });
  };

  const onUnsupported = useCallback(() => setNo3d(true), []);

  /* Magnifier: the photo follows the pointer at 2× */
  function onMove(event) {
    if (!zoomOn || !canHover()) return;
    const box = event.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    });
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse') return;
    swipe.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event) {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      const rtl = document.documentElement.dir === 'rtl';
      go((dx < 0) !== rtl ? 1 : -1);
    }
  }

  function onKeyDown(event) {
    const rtl = document.documentElement.dir === 'rtl';
    if (event.key === 'ArrowRight') go(rtl ? -1 : 1);
    if (event.key === 'ArrowLeft') go(rtl ? 1 : -1);
  }

  if (!count) {
    return (
      <figure className="pmMedia pgal pgalEmpty">
        <Package aria-hidden="true" />
      </figure>
    );
  }

  const slides = images.map((src, i) => ({ src, alt: `${alt} – ${i + 1}`, title: count > 1 ? `${alt} · ${i + 1}/${count}` : alt }));

  return (
    <div className={`pgal pgal-${mode}`}>
      <figure className="pmMedia pgalStage">
        {mode === 'photo' ? (
          <div
            className={`pgalPhoto ${zoom ? 'zooming' : ''}`}
            onMouseMove={onMove}
            onMouseLeave={() => setZoom(null)}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <PhotoFrame zoomOn={zoomOn} onOpen={() => setViewer(index)} label={`${t('lightbox.open')}: ${alt}`}>
              {images.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={i === index ? `${alt}${count > 1 ? ` – ${i + 1}/${count}` : ''}` : ''}
                  className={i === index ? 'active' : ''}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable="false"
                  style={i === index && zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                />
              ))}
              {zoomOn && <span className="pgalZoomHint" aria-hidden="true"><Maximize2 /></span>}
            </PhotoFrame>

            {count > 1 && (
              <>
                <button type="button" className="pgalArrow prev" onClick={() => go(-1)} aria-label={g('previous')}>
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button type="button" className="pgalArrow next" onClick={() => go(1)} aria-label={g('next')}>
                  <ChevronRight aria-hidden="true" />
                </button>
                <span className="pgalCounter" aria-live="polite" dir="ltr">{g('counter', { current: index + 1, total: count })}</span>
              </>
            )}
          </div>
        ) : (
          <div className="pgal3d">
            <Suspense fallback={<div className="p3d p3d-loading"><div className="p3dLoading"><span className="p3dSpinner" aria-hidden="true" />{g('loading')}</div></div>}>
              <Photo3DViewer key={current} src={current} alt={alt} onUnsupported={onUnsupported} />
            </Suspense>
          </div>
        )}

        <figcaption>
          {tag && <span className="pmMediaTag">{tag}</span>}
          {code && <span className="pmMediaCode">{code}</span>}
        </figcaption>

        {/* Photo / 3D switch */}
        {show3d && (
          <div className="pgalModes" role="tablist" aria-label={g('modes')}>
            <button type="button" role="tab" aria-selected={mode === 'photo'} className={mode === 'photo' ? 'active' : ''} onClick={() => setMode('photo')}>
              <ImageIcon aria-hidden="true" />
              {g('photo')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === '3d'}
              className={mode === '3d' ? 'active' : ''}
              onClick={open3d}
              onPointerEnter={preloadViewer}
              onFocus={preloadViewer}
            >
              <Box aria-hidden="true" />
              {g('view3d')}
            </button>
          </div>
        )}
      </figure>

      <div className="pgalThumbs" ref={thumbsRef} role="list" aria-label={g('thumbs')}>
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            role="listitem"
            className={`pgalThumb ${i === index && mode === 'photo' ? 'active' : ''} ${i === index && mode === '3d' ? 'source' : ''}`}
            aria-current={i === index ? 'true' : undefined}
            aria-label={`${g('show')} ${i + 1}/${count}`}
            onClick={() => choose(i)}
          >
            <img src={src} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
        {show3d && (
          <button
            type="button"
            role="listitem"
            className={`pgalThumb pgalThumb3d ${mode === '3d' ? 'active' : ''}`}
            onClick={mode === '3d' ? () => setMode('photo') : open3d}
            onPointerEnter={preloadViewer}
            onFocus={preloadViewer}
            aria-label={mode === '3d' ? g('backToPhoto') : g('open3d')}
          >
            <img src={current} alt="" loading="lazy" decoding="async" />
            <span><Box aria-hidden="true" />3D</span>
          </button>
        )}
      </div>

      {zoomOn && <ImageLightbox slides={slides} index={viewer} onClose={() => setViewer(-1)} />}
    </div>
  );
}

/* The large photo: a button that opens full screen, or a plain frame when zoom is off */
function PhotoFrame({ zoomOn, onOpen, label, children }) {
  if (!zoomOn) return <div className="pgalOpen pgalStatic">{children}</div>;
  return (
    <button type="button" className="pgalOpen" onClick={onOpen} aria-label={label}>
      {children}
    </button>
  );
}
