import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminLogin } from '../../services/adminApi';

export default function AdminLogin() {
  const navigate = useNavigate();

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

      localStorage.setItem(
        'rma_admin_token',
        data.token
      );

      localStorage.setItem(
        'rma_admin_user',
        JSON.stringify(data.admin)
      );

      navigate('/admin');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
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
                value={form.password}
                onChange={handleChange}
                required
              />
            </label>

            {error && (
              <div className="adminLoginError">
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