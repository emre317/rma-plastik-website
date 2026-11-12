import { useRef, useState } from 'react';
import { FileUp, X } from 'lucide-react';

export const DRAWING_ACCEPT = '.png,.jpg,.jpeg,.pdf,.docx';
const MAX_BYTES = 15 * 1024 * 1024;

const typeOf = (url) => (/\.(png|jpg|pdf|docx)$/.exec(url || '')?.[1] || '').toUpperCase();

/*
  Technical drawing of a product table or of one model (Ürün Tabloları):
  uploads a PNG, JPG, PDF or DOCX and keeps its site path.
    value: '/uploads/drawings/<id>.pdf' or ''
    upload(file) -> path ('' when it failed; the page shows the error)
    compact: icon-sized, for a table cell
*/
export default function DrawingField({ value, onChange, upload, onError, compact = false, label = 'Teknik çizim' }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!/\.(png|jpe?g|pdf|docx)$/i.test(file.name)) return onError?.('Teknik çizim PNG, JPG, PDF veya DOCX olmalıdır.');
    if (file.size > MAX_BYTES) return onError?.('Teknik çizim en fazla 15 MB olabilir.');

    setBusy(true);
    const url = await upload(file);
    setBusy(false);
    if (url) onChange(url);
  }

  const input = <input ref={inputRef} type="file" accept={DRAWING_ACCEPT} hidden onChange={pick} />;

  if (compact) {
    return (
      <span className={`cmsDrawing compact ${value ? 'filled' : ''}`}>
        {input}
        {value ? (
          <>
            <a href={value} target="_blank" rel="noopener noreferrer" title={`${label} – dosyayı aç`}>{typeOf(value)}</a>
            <button type="button" className="cmsDrawingRemove" onClick={() => onChange('')} aria-label={`${label} – kaldır`} title="Kaldır">
              <X aria-hidden="true" />
            </button>
          </>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} aria-label={`${label} – yükle`} title="Teknik çizim yükle (PNG, JPG, PDF, DOCX)">
            {busy ? '…' : <FileUp aria-hidden="true" />}
          </button>
        )}
      </span>
    );
  }

  return (
    <div className="cmsDrawing">
      {input}
      {value && (
        <a className="cmsDrawingFile" href={value} target="_blank" rel="noopener noreferrer">
          <span>{typeOf(value)}</span>
          Yüklü dosyayı aç
        </a>
      )}
      <div className="cmsRowActions">
        <button type="button" className="cmsButton" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Yükleniyor…' : value ? 'Dosyayı değiştir' : 'Teknik çizim yükle'}
        </button>
        {value && <button type="button" className="cmsButton cmsButtonDanger" onClick={() => onChange('')}>Kaldır</button>}
      </div>
      <small className="cmsHint">PNG, JPG, PDF veya DOCX · en fazla 15 MB</small>
    </div>
  );
}
