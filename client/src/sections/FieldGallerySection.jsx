import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';

import useLanguage from '../hooks/useLanguage';
import gallery, { galleryText } from '../data/gallery';

/*
  Field photos from the admin panel (Saha fotoğrafları): a grid with a
  full-screen viewer. Hidden while no photo is published.
*/
export default function FieldGallerySection() {
  const { t } = useTranslation();
  const { code: lang, dir } = useLanguage();
  const [open, setOpen] = useState(-1);

  const close = useCallback(() => setOpen(-1), []);
  const step = useCallback((delta) => setOpen((index) => (index + delta + gallery.length) % gallery.length), []);

  useEffect(() => {
    if (open < 0) return undefined;

    // Arrow keys follow the reading direction
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    const onKey = (event) => {
      if (event.key === 'Escape') close();
      if (event.key === forward) step(1);
      if (event.key === back) step(-1);
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, dir, close, step]);

  if (!gallery.length) return null;

  const current = gallery[open];

  return (
    <section className="cmBlock fgSection" id="field">
      <div className="container">
        <div className="cmSectionHead cmSectionHeadSplit">
          <div>
            <p className="eyebrow">{t('gallery.eyebrow')}</p>
            <h2>
              {t('gallery.title')}
              <span>{t('gallery.titleAccent')}</span>
            </h2>
          </div>
          <p className="cmLead">{t('gallery.lead')}</p>
        </div>

        <ul className="fgGrid">
          {gallery.map((photo, index) => {
            const caption = galleryText(photo, 'caption', lang);
            const location = galleryText(photo, 'location', lang);

            return (
              <li key={photo.image}>
                <button type="button" className="fgItem" onClick={() => setOpen(index)} aria-label={`${t('gallery.open')}: ${caption || index + 1}`}>
                  <img src={photo.image} alt={caption} loading="lazy" decoding="async" />
                  {(caption || location) && (
                    <span className="fgCaption">
                      {caption && <strong>{caption}</strong>}
                      {location && <small><MapPin aria-hidden="true" />{location}</small>}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {current && (
        <div className="fgViewer" role="dialog" aria-modal="true" aria-label={galleryText(current, 'caption', lang) || t('gallery.eyebrow')}>
          <button type="button" className="fgBackdrop" onClick={close} aria-label={t('gallery.close')} tabIndex={-1} />
          <figure>
            <img src={current.image} alt={galleryText(current, 'caption', lang)} />
            <figcaption>
              <span>
                {galleryText(current, 'caption', lang) && <strong>{galleryText(current, 'caption', lang)}</strong>}
                {galleryText(current, 'location', lang) && <small><MapPin aria-hidden="true" />{galleryText(current, 'location', lang)}</small>}
              </span>
              <em dir="ltr">{open + 1} / {gallery.length}</em>
            </figcaption>
          </figure>
          <button type="button" className="fgClose" onClick={close} aria-label={t('gallery.close')} autoFocus><X aria-hidden="true" /></button>
          {gallery.length > 1 && (
            <>
              <button type="button" className="fgNav prev" onClick={() => step(-1)} aria-label={t('gallery.prev')}><ChevronLeft aria-hidden="true" /></button>
              <button type="button" className="fgNav next" onClick={() => step(1)} aria-label={t('gallery.next')}><ChevronRight aria-hidden="true" /></button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
