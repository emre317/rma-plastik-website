import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Box, ImagePlus, Star, Trash2, X } from 'lucide-react';

const Photo3DViewer = lazy(() => import('../product3d/Photo3DViewer'));

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

/* Large 3D preview of one photo, as the site will show it */
export function Preview3dDialog({ src, title = '', onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!src) return undefined;
    const previous = document.activeElement;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    setTimeout(() => closeRef.current?.focus(), 30);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [src, onClose]);

  if (!src) return null;

  return createPortal(
    <div className="ig3dLayer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="ig3dPanel" role="dialog" aria-modal="true" aria-label="3D önizleme">
        <div className="ig3dHead">
          <div>
            <strong>3D önizleme</strong>
            <small>{title || 'Sitede “3D” seçildiğinde bu görünüm gösterilir.'}</small>
          </div>
          <button type="button" ref={closeRef} onClick={onClose} aria-label="Kapat"><X aria-hidden="true" /></button>
        </div>
        <div className="ig3dStage">
          <Suspense fallback={<div className="p3d p3d-loading"><div className="p3dLoading"><span className="p3dSpinner" aria-hidden="true" />3D görünüm hazırlanıyor…</div></div>}>
            <Photo3DViewer src={src} alt={title} />
          </Suspense>
        </div>
        <p className="ig3dNote">
          3D görünüm fotoğraftan otomatik oluşturulur. En iyi sonucu düz (beyaz veya açık gri) zeminde, ürünün
          tamamının göründüğü ve başka nesne bulunmayan fotoğraflar verir.
        </p>
      </div>
    </div>,
    document.body
  );
}

/*
  Photo list editor for the admin panel: the first photo is the cover.
    <ImageGalleryEditor images={[cover, ...more]} onChange={setList} upload={file => url} max={13} />
  Several files at once (button or drag and drop), reorder, make cover,
  remove, and preview any photo in 3D.
*/
export default function ImageGalleryEditor({ images, onChange, upload, max = 13, title = '', compact = false }) {
  const [pending, setPending] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState('');
  const [note, setNote] = useState('');
  const inputRef = useRef(null);
  const listRef = useRef(images);

  useEffect(() => {
    listRef.current = images;
  }, [images]);

  const room = Math.max(0, max - images.length);

  async function addFiles(fileList) {
    const files = [...fileList].filter((file) => ACCEPT.includes(file.type));
    const skipped = fileList.length - files.length;
    const accepted = files.slice(0, room);
    const over = files.length - accepted.length;

    setNote([
      skipped ? `${skipped} dosya JPG, PNG veya WEBP olmadığı için eklenmedi.` : '',
      over ? `En fazla ${max} görsel eklenebilir; ${over} dosya eklenmedi.` : '',
    ].filter(Boolean).join(' '));

    if (!accepted.length) return;
    setPending((value) => value + accepted.length);

    // One by one, so the order is the order of the files
    for (const file of accepted) {
      const url = await upload(file);
      setPending((value) => value - 1);
      if (url && !listRef.current.includes(url)) {
        const next = [...listRef.current, url];
        listRef.current = next;
        onChange(next);
      }
    }
  }

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const makeCover = (index) => onChange([images[index], ...images.filter((_, i) => i !== index)]);
  const remove = (index) => onChange(images.filter((_, i) => i !== index));

  return (
    <div className={`igEditor ${compact ? 'compact' : ''}`}>
      <ul
        className={`igGrid ${dragging ? 'dragging' : ''}`}
        onDragOver={(event) => { if (event.dataTransfer?.types?.includes('Files')) { event.preventDefault(); setDragging(true); } }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files);
        }}
      >
        {images.map((src, index) => (
          <li key={src} className={`igTile ${index === 0 ? 'cover' : ''}`}>
            <img src={src} alt="" loading="lazy" />
            {index === 0 && <span className="igCoverBadge"><Star aria-hidden="true" />Kapak</span>}
            <span className="igIndex">{index + 1}</span>
            <div className="igTools">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Öne al" title="Öne al"><ArrowLeft aria-hidden="true" /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label="Geri al" title="Geri al"><ArrowRight aria-hidden="true" /></button>
              {index > 0 && <button type="button" onClick={() => makeCover(index)} aria-label="Kapak yap" title="Kapak yap"><Star aria-hidden="true" /></button>}
              <button type="button" onClick={() => setPreview(src)} aria-label="3D önizleme" title="3D önizleme"><Box aria-hidden="true" /></button>
              <button type="button" className="danger" onClick={() => remove(index)} aria-label="Görseli kaldır" title="Kaldır"><Trash2 aria-hidden="true" /></button>
            </div>
          </li>
        ))}

        {Array.from({ length: pending }, (_, i) => (
          <li key={`pending-${i}`} className="igTile pending" aria-label="Yükleniyor">
            <span className="p3dSpinner" aria-hidden="true" />
          </li>
        ))}

        {room > 0 && (
          <li className="igTile igAdd">
            <button type="button" onClick={() => inputRef.current?.click()}>
              <ImagePlus aria-hidden="true" />
              <strong>Görsel ekle</strong>
              <small>Birden fazla seçebilir veya sürükleyip bırakabilirsiniz</small>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT.join(',')}
              multiple
              hidden
              onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }}
            />
          </li>
        )}
      </ul>

      {note && <p className="igNote" role="status">{note}</p>}

      <p className="cmsHint">
        İlk görsel kapak olarak kullanılır (listeler, teklif ve paylaşım görselleri). En fazla {max} görsel.
        3D görünüm için düz zeminde, ürünün tamamının göründüğü fotoğraflar en iyi sonucu verir.
      </p>

      <Preview3dDialog src={preview} title={title} onClose={() => setPreview('')} />
    </div>
  );
}
