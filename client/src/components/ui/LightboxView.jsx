import { useTranslation } from 'react-i18next';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'yet-another-react-lightbox/plugins/counter.css';

/*
  The lightbox itself (yet-another-react-lightbox). Loaded only when a photo is
  opened (see ImageLightbox.jsx), so its code and CSS never slow the first page.
*/
export default function LightboxView({ slides, index, onClose }) {
  const { t } = useTranslation();
  const l = (key) => t(`lightbox.${key}`);
  const single = slides.length < 2;

  return (
    <Lightbox
      open
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Zoom, Captions, ...(single ? [] : [Counter])]}
      className="rmaLightbox"
      carousel={{ finite: single, padding: '16px' }}
      controller={{ closeOnBackdropClick: true }}
      zoom={{ maxZoomPixelRatio: 2.5, scrollToZoom: true }}
      captions={{ descriptionTextAlign: 'center', descriptionMaxLines: 3 }}
      render={single ? { buttonPrev: () => null, buttonNext: () => null } : undefined}
      labels={{
        Previous: l('previous'),
        Next: l('next'),
        Close: l('close'),
        'Zoom in': l('zoomIn'),
        'Zoom out': l('zoomOut'),
        Lightbox: l('title'),
        Carousel: l('title'),
        'Photo gallery': l('title'),
        Slide: l('slide'),
        Loading: l('loading'),
        Error: l('error'),
        '{index} of {total}': l('counter'),
      }}
    />
  );
}
