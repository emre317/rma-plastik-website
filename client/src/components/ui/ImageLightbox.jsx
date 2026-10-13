import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize2 } from 'lucide-react';

const LightboxView = lazy(() => import('./LightboxView'));

/*
  Full-screen photo viewer with zoom, swipe and captions.
    <ImageLightbox slides={[{ src, alt, title, description }]} index={i} onClose={…} />
  Nothing is rendered (or downloaded) until index >= 0.
*/
export default function ImageLightbox({ slides, index, onClose }) {
  if (index < 0 || !slides.length) return null;

  return (
    <Suspense fallback={null}>
      <LightboxView slides={slides} index={index} onClose={onClose} />
    </Suspense>
  );
}

/*
  A photo that opens full screen on click: <ZoomableImage src alt caption />.
  Keeps the page's own <img> (same size and look), adds a zoom hint on hover.
*/
export function ZoomableImage({ src, alt = '', caption = '', className = '', imgProps = {} }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(-1);

  if (!src) return null;

  return (
    <>
      <button type="button" className={`zoomable ${className}`} onClick={() => setOpen(0)} aria-label={`${t('lightbox.open')}: ${alt || caption}`}>
        <img src={src} alt={alt} {...imgProps} />
        <span className="zoomableHint" aria-hidden="true"><Maximize2 /></span>
      </button>
      <ImageLightbox slides={[{ src, alt, title: caption || undefined }]} index={open} onClose={() => setOpen(-1)} />
    </>
  );
}
