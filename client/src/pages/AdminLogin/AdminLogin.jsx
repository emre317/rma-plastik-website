import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail,
} from 'lucide-react';

import { adminLogin } from '../../services/adminApi';
import {
  hasValidAdminSession,
  saveAdminSession,
} from '../../services/adminAuth';
import usePageTitle from '../../hooks/usePageTitle';
import useAdminDocumentLanguage from '../../hooks/useAdminDocumentLanguage';
import AdminAuthLayout from '../../components/admin/AdminAuthLayout';

export default function AdminLogin() {
  usePageTitle('Yönetici Girişi');
  useAdminDocumentLanguage();

  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo =
    location.state?.from?.pathname?.startsWith('/admin')
      ? location.state.from.pathname + (location.state.from.search || '')
      : '/admin';

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setStatus('loading');
    setError('');

    try {
      const data = await adminLogin(form);

      saveAdminSession(data.token, data.admin);

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  const checkCaps = (event) => setCapsLock(Boolean(event.getModifierState?.('CapsLock')));

  if (status === 'idle' && hasValidAdminSession()) {
    return <Navigate to={redirectTo} replace />;
  }

  const loading = status === 'loading';

  return (
    <AdminAuthLayout>
      <span className="algEyebrow">Yönetici Girişi</span>
      <h1>Tekrar Hoş Geldiniz</h1>
      <p>Devam etmek için yönetici e-posta adresiniz ve şifrenizle giriş yapın.</p>

      <form className="algForm" onSubmit={handleSubmit}>
        <label className="algField">
          <span>E-posta</span>
          <span className="algInput">
            <Mail aria-hidden="true" />
            <input
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              placeholder="ad@rmaplastik.com"
              value={form.email}
              onChange={handleChange}
              required
              autoFocus
              aria-invalid={Boolean(error) || undefined}
            />
          </span>
        </label>

        <label className="algField">
          <span className="algFieldHead">
            Şifre
            <Link to="/admin/forgot-password" state={{ email: form.email }} className="algLink">Şifremi Unuttum</Link>
          </span>
          <span className="algInput">
            <Lock aria-hidden="true" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              onKeyUp={checkCaps}
              onKeyDown={checkCaps}
              onBlur={() => setCapsLock(false)}
              required
              aria-invalid={Boolean(error) || undefined}
            />
            <button
              type="button"
              className="algReveal"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              title={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </span>
          {capsLock && <small className="algCaps">Caps Lock açık</small>}
        </label>

        {error && (
          <div className="algError" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="algSubmit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="algSpin" aria-hidden="true" />
              <span>Giriş yapılıyor…</span>
            </>
          ) : (
            <>
              <span>Giriş Yap</span>
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AdminAuthLayout>
  );
}
