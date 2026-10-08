/*
  Admin image uploads are made smaller in the browser before they are sent:
  longest side at most MAX_SIDE pixels, saved as WebP (JPEG where the
  browser cannot write WebP). Files that are already small, animated GIFs and
  anything the browser cannot draw are sent unchanged.
*/

const MAX_SIDE = 2000;
const QUALITY = 0.82;
const SMALL_ENOUGH = 300 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };
    image.src = url;
  });
}

const toBlob = (canvas, type) => new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));

export default async function optimizeImage(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type) || typeof document === 'undefined') return file;

  try {
    const image = await loadImage(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));

    if (scale === 1 && file.size <= SMALL_ENOUGH) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

    let blob = await toBlob(canvas, 'image/webp');

    // Safari writes PNG when asked for WebP: photos then go as JPEG, transparent PNGs stay PNG
    if (!blob || blob.type !== 'image/webp') {
      blob = file.type === 'image/png' ? await toBlob(canvas, 'image/png') : await toBlob(canvas, 'image/jpeg');
    }

    if (!blob || blob.size >= file.size) return file;

    const extension = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }[blob.type];
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.${extension}`;

    return new File([blob], name, { type: blob.type });
  } catch {
    return file;
  }
}
