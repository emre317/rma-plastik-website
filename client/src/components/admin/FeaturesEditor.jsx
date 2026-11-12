import { Check } from 'lucide-react';

export const MAX_FEATURES = 20;

/* Text of the feature box -> the lines that will be saved */
export const featureLines = (text) => String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

/*
  "Standart özellikler" editor of the panel (product group, product family,
  single model): an optional heading, one feature per line and a preview of
  the card as the site shows it.
    inherited: features that come from a level above (shown first on the site)
*/
export default function FeaturesEditor({
  features,
  onFeatures,
  title,
  onTitle,
  defaultTitle = 'Standart Özellikler',
  dir,
  inherited = [],
  inheritedLabel = '',
  placeholder = 'Tek parça monoblok gövde\nUV koruması\n…',
}) {
  const own = featureLines(features);
  const count = own.length;
  const taken = new Set(inherited.map((item) => item.trim().toLocaleLowerCase('tr')));
  const shown = own.slice(0, MAX_FEATURES).filter((item) => !taken.has(item.toLocaleLowerCase('tr')));

  return (
    <>
      {onTitle && (
        <label className="cmsField">
          <span>Bölüm Başlığı</span>
          <input dir={dir} value={title || ''} maxLength={80} placeholder={defaultTitle} onChange={(event) => onTitle(event.target.value)} />
          <small>Boş bırakılırsa “{defaultTitle}” yazılır.</small>
        </label>
      )}

      <label className="cmsField">
        <span>Özellikler <span className="cmsMuted">({count}/{MAX_FEATURES})</span></span>
        <textarea
          rows={Math.min(14, Math.max(5, count + 2))}
          dir={dir}
          value={features || ''}
          placeholder={placeholder}
          onChange={(event) => onFeatures(event.target.value)}
        />
        <small>Her satıra bir özellik yazın.</small>
        {count > MAX_FEATURES && <small className="cmsFeaturesOver">En fazla {MAX_FEATURES} özellik kaydedilir; fazlası alınmaz.</small>}
      </label>

      {(shown.length > 0 || inherited.length > 0) && (
        <div className="cmsFeaturesPreview" dir={dir}>
          <strong>{title || defaultTitle}</strong>
          <ul>
            {inherited.map((feature, index) => (
              <li key={`i${index}`} className="inherited" title={inheritedLabel}><Check aria-hidden="true" />{feature}</li>
            ))}
            {shown.map((feature, index) => (
              <li key={index}><Check aria-hidden="true" />{feature}</li>
            ))}
          </ul>
          {inherited.length > 0 && <small className="cmsFeaturesLegend">Soluk satırlar {inheritedLabel} gelir; buradan değiştirilmez.</small>}
        </div>
      )}
    </>
  );
}
