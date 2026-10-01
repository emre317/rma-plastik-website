import logoWebp from '../assets/brand/rma-logo.webp';
import logoPng from '../assets/brand/rma-logo.png';
import logoLightWebp from '../assets/brand/rma-logo-light.webp';
import logoLightPng from '../assets/brand/rma-logo-light.png';

const variants = {
  // Full-colour logo for light backgrounds
  default: { webp: logoWebp, png: logoPng },
  // White wordmark for dark backgrounds
  light: { webp: logoLightWebp, png: logoLightPng },
};

// Intrinsic size of the exported files (keeps layout stable while loading)
const WIDTH = 534;
const HEIGHT = 192;

export default function BrandLogo({ variant = 'default', className = '', alt = 'RMA Plastik' }) {
  const source = variants[variant] || variants.default;

  return (
    <picture className={`brandLogo ${className}`}>
      <source srcSet={source.webp} type="image/webp" />
      <img
        src={source.png}
        alt={alt}
        width={WIDTH}
        height={HEIGHT}
        decoding="async"
      />
    </picture>
  );
}
