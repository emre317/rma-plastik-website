/*
  First page of a PDF as a WebP image, made in the browser (admin panel,
  Sertifikalar): the certificate card on the site shows this picture.
  pdf.js loads only when it is needed, so visitors never download it.
*/
const WIDTH = 900;

export default async function pdfPreview(file) {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  try {
    const page = await document.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: WIDTH / base.width });

    const canvas = window.document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, canvas }).promise;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    if (!blob) throw new Error('Önizleme görseli oluşturulamadı.');
    return new File([blob], `${file.name.replace(/\.pdf$/i, '')}.webp`, { type: blob.type || 'image/webp' });
  } finally {
    document.destroy();
  }
}
