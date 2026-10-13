import { useState } from 'react';
import { Check, Eye, EyeOff, Lock } from 'lucide-react';

/* Same rule as the server (controllers/authController.js passwordProblem) */
export const PASSWORD_RULES = [
  { id: 'length', label: 'En az 8 karakter', test: (value) => value.length >= 8 },
  { id: 'letter', label: 'En az bir harf', test: (value) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(value) },
  { id: 'digit', label: 'En az bir rakam', test: (value) => /\d/.test(value) },
];

export const passwordOk = (value) => PASSWORD_RULES.every((rule) => rule.test(value || ''));

/* Random 14-character password with letters and digits (for "Şifre Oluştur") */
export function generatePassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const random = new Uint32Array(14);
  crypto.getRandomValues(random);
  const chars = [...random].map((n) => all[n % all.length]);
  chars[0] = letters[random[0] % letters.length];
  chars[13] = digits[random[13] % digits.length];
  return chars.join('');
}

/*
  Password input with show / hide, Caps Lock hint and (with `rules`) a live
  checklist. `variant="auth"` for the sign-in pages, otherwise panel style.
*/
export default function PasswordField({
  label, value, onChange, autoComplete = 'new-password', rules = false, variant = 'panel', name, placeholder = '••••••••', required = true, extra,
}) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const checkCaps = (event) => setCaps(Boolean(event.getModifierState?.('CapsLock')));

  return (
    <label className={variant === 'auth' ? 'algField' : 'cmsField pwField'}>
      <span className={variant === 'auth' ? 'algFieldHead' : undefined}>
        {label}
        {extra}
      </span>
      <span className="algInput">
        <Lock aria-hidden="true" />
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={checkCaps}
          onKeyUp={checkCaps}
          onBlur={() => setCaps(false)}
        />
        <button
          type="button"
          className="algReveal"
          onClick={() => setShow((current) => !current)}
          aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
          title={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
        >
          {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </span>
      {caps && <small className="algCaps">Caps Lock açık</small>}
      {rules && (
        <ul className="pwRules" aria-label="Şifre kuralları">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(value || '');
            return (
              <li key={rule.id} className={ok ? 'ok' : ''}>
                <Check aria-hidden="true" />
                {rule.label}
              </li>
            );
          })}
        </ul>
      )}
    </label>
  );
}
