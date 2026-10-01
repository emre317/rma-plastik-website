import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { adminLogin } from '../../services/adminApi';
import {
  hasValidAdminSession,
  saveAdminSession,
} from '../../services/adminAuth';
import usePageTitle from '../../hooks/usePageTitle';

export default function AdminLogin() {
  usePageTitle('Admin Login');

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
          <span>RMA</span>
          <small>ADMIN</small>
        </div>

        <div className="adminLoginContent">

          <span className="eyebrow">
            MANAGEMENT SYSTEM
          </span>

          <h1>
            Welcome
            <span>back.</span>
          </h1>

          <p>
            Sign in to manage quote requests and website operations.
          </p>

          <form
            className="adminLoginForm"
            onSubmit={handleSubmit}
          >
            <label>
              <span>Email</span>

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
              <span>Password</span>

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
                  ? 'Signing in...'
                  : 'Sign In'}
              </span>

              <span>↗</span>
            </button>
          </form>

        </div>

      </div>
    </main>
  );
}