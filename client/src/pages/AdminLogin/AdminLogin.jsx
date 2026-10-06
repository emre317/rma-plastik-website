import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { adminLogin } from '../../services/adminApi';
import {
  hasValidAdminSession,
  saveAdminSession,
} from '../../services/adminAuth';
import usePageTitle from '../../hooks/usePageTitle';
import useAdminDocumentLanguage from '../../hooks/useAdminDocumentLanguage';
import BrandLogo from '../../components/BrandLogo';

export default function AdminLogin() {
  usePageTitle('Yönetici girişi');
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

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
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

  if (status === 'idle' && hasValidAdminSession()) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <main className="adminLoginPage">
      <div className="adminLoginPanel">

        <div className="adminLoginBrand">
          <BrandLogo alt="RMA Plastik" />
          <small>Yönetim paneli</small>
        </div>

        <div className="adminLoginContent">

          <span className="eyebrow">
            Yönetim paneli
          </span>

          <h1>
            Tekrar
            <span>hoş geldiniz.</span>
          </h1>

          <p>
            Teklif taleplerini, ürün tablolarını ve site içeriğini yönetmek için giriş yapın.
          </p>

          <form
            className="adminLoginForm"
            onSubmit={handleSubmit}
          >
            <label>
              <span>E-posta</span>

              <input
                type="email"
                name="email"
                autoComplete="username"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              <span>Şifre</span>

              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </label>

            {error && (
              <div className="adminLoginError" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
            >
              <span>
                {status === 'loading'
                  ? 'Giriş yapılıyor…'
                  : 'Giriş yap'}
              </span>

              <span>↗</span>
            </button>
          </form>

        </div>

      </div>
    </main>
  );
}