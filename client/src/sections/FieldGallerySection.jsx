import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';

import useLanguage from '../hooks/useLanguage';
import gallery, { galleryText } from '../data/gallery';
import ImageLightbox from '../components/ui/ImageLightbox';

/*
  Field photos from the admin panel (Saha fotoğrafları): a grid with a
  full-screen viewer (zoom, swipe, captions). Hidden while no photo is published.
*/
export default function FieldGallerySection() {
  const { t } = useTranslation();
  const { code: lang } = useLanguage();
  const [open, setOpen] = useState(-1);

  if (!gallery.length) return null;

  const slides = gallery.map((photo) => ({
    src: photo.image,
    alt: galleryText(photo, 'caption', lang),
    title: galleryText(photo, 'caption', lang) || undefined,
    description: galleryText(photo, 'location', lang) || undefined,
  }));

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

      <ImageLightbox slides={slides} index={open} onClose={() => setOpen(-1)} />
    </section>
  );
}
