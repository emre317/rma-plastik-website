import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, ArrowRight, Loader2, Mail, MailCheck,
} from 'lucide-react';

import { requestPasswordReset } from '../../services/adminApi';
import usePageTitle from '../../hooks/usePageTitle';
import useAdminDocumentLanguage from '../../hooks/useAdminDocumentLanguage';
import AdminAuthLayout from '../../components/admin/AdminAuthLayout';

/* "Şifremi unuttum": a reset link is e-mailed (the page never says whether the address exists) */
export default function AdminForgotPassword() {
  usePageTitle('Şifremi Unuttum');
  useAdminDocumentLanguage();

  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await requestPasswordReset(email.trim());
      setStatus('sent');
      setMessage(response.message);
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  }

  const back = (
    <Link to="/admin/login" className="algBack">
      <ArrowLeft aria-hidden="true" />
      Girişe Dön
    </Link>
  );

  if (status === 'sent') {
    return (
      <AdminAuthLayout back={back}>
        <span className="algDoneIcon" aria-hidden="true"><MailCheck /></span>
        <span className="algEyebrow">E-posta Gönderildi</span>
        <h1>Gelen Kutunuzu Kontrol Edin</h1>
        <p role="status">{message}</p>
        <p className="algNote">Bağlantı 1 saat geçerlidir. E-posta gelmezse birkaç dakika sonra tekrar deneyin ya da panelde yetkili bir yöneticiden şifrenizi sıfırlamasını isteyin.</p>
        <button type="button" className="algSecondary" onClick={() => setStatus('idle')}>Tekrar Gönder</button>
      </AdminAuthLayout>
    );
  }

  return (
    <AdminAuthLayout back={back}>
      <span className="algEyebrow">Şifremi Unuttum</span>
      <h1>Şifrenizi Sıfırlayın</h1>
      <p>Yönetici e-posta adresinizi yazın; yeni şifre belirlemeniz için bir bağlantı gönderelim.</p>

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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          </span>
        </label>

        {status === 'error' && (
          <div className="algError" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}

        <button type="submit" className="algSubmit" disabled={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <Loader2 className="algSpin" aria-hidden="true" />
              <span>Gönderiliyor…</span>
            </>
          ) : (
            <>
              <span>Bağlantı Gönder</span>
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AdminAuthLayout>
  );
}
