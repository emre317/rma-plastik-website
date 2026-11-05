import { useTranslation } from 'react-i18next';

/*
  KVKK text and optional consent boxes above a form's send button
  (KVKK set, section 2). All boxes start unticked and sending never depends
  on them. Box keys match server/services/consents.js:
    a       Pazarlama açık rızası
    bEmail  Ticari elektronik ileti – e-posta
    bSms    … – SMS            (quote form only)
    bCall   … – telefon araması (quote form only)
    c       Reklam platformlarıyla eşleştirme (hash) açık rızası
  Links open the texts in a new tab so the form stays filled in.
*/
export const EMPTY_CONSENTS = { a: false, bEmail: false, bSms: false, bCall: false, c: false };

function TextLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="consentLink">{children}</a>
  );
}

export default function ConsentBoxes({ form, value, onChange }) {
  const { t, i18n } = useTranslation();
  const k = (key) => t(`consentBoxes.${key}`);
  const base = `/${i18n.resolvedLanguage || 'tr'}/kvkk`;
  const set = (key) => (event) => onChange({ ...value, [key]: event.target.checked });

  const box = (key, label) => (
    <label className="consentBox">
      <input type="checkbox" checked={value[key]} onChange={set(key)} />
      <span>{label}</span>
    </label>
  );

  const linked = (prefix, href) => (
    <>
      {k(`${prefix}.before`)}
      <TextLink href={href}>{k(`${prefix}.link`)}</TextLink>
      {k(`${prefix}.after`)}
    </>
  );

  return (
    <div className="consentBoxes">
      <p className="consentIntro">
        {linked(`${form}.intro`, `${base}#${form === 'quote' ? 'teklif-formu' : 'katalog-formu'}`)}
      </p>

      {box('a', linked('a', `${base}#pazarlama-acik-riza`))}

      {form === 'quote' ? (
        <fieldset className="consentChannels">
          <legend>{k('quote.b')}</legend>
          <div>
            {box('bEmail', k('channels.email'))}
            {box('bSms', k('channels.sms'))}
            {box('bCall', k('channels.call'))}
          </div>
        </fieldset>
      ) : (
        box('bEmail', k('catalog.b'))
      )}

      {box('c', linked(`${form}.c`, `${base}#reklam-eslestirme-acik-riza`))}
    </div>
  );
}
