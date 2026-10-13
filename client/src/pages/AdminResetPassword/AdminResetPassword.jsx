import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, ArrowRight, Link2Off, Loader2,
} from 'lucide-react';

import { checkResetToken, resetPassword } from '../../services/adminApi';
import { saveAdminSession } from '../../services/adminAuth';
import usePageTitle from '../../hooks/usePageTitle';
import useAdminDocumentLanguage from '../../hooks/useAdminDocumentLanguage';
import AdminAuthLayout from '../../components/admin/AdminAuthLayout';
import PasswordField, { passwordOk } from '../../components/admin/PasswordField';

/*
  New password from an e-mail link: password reset, or an invitation
  (?invite=1) where the new user chooses the first password. Signs in afterwards.
*/
export default function AdminResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const inviteLink = params.get('invite') === '1';

  usePageTitle(inviteLink ? 'Şifrenizi Belirleyin' : 'Yeni Şifre');
  useAdminDocumentLanguage();

  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setInvalid('Bağlantı eksik. E-postadaki bağlantıyı tam olarak açın ya da yeni bir bağlantı isteyin.');
      setChecking(false);
      return undefined;
    }

    checkResetToken(token)
      .then((response) => !cancelled && setAccount(response.data))
      .catch((err) => !cancelled && setInvalid(err.message))
      .finally(() => !cancelled && setChecking(false));

    return () => {
      cancelled = true;
    };
  }, [token]);

  const invite = account?.invite ?? inviteLink;
  const mismatch = repeat && password !== repeat;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!passwordOk(password) || password !== repeat) return;

    setStatus('loading');
    setError('');

    try {
      const data = await resetPassword(token, password);
      saveAdminSession(data.token, data.admin);
      navigate('/admin', { replace: true });
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  const back = (
    <Link to="/admin/login" className="algBack">
      <ArrowLeft aria-hidden="true" />
      Girişe Dön
    </Link>
  );

  if (checking) {
    return (
      <AdminAuthLayout back={back}>
        <p className="algChecking" role="status"><Loader2 className="algSpin" aria-hidden="true" />Bağlantı kontrol ediliyor…</p>
      </AdminAuthLayout>
    );
  }

  if (invalid) {
    return (
      <AdminAuthLayout back={back}>
        <span className="algDoneIcon warn" aria-hidden="true"><Link2Off /></span>
        <span className="algEyebrow">Bağlantı Geçersiz</span>
        <h1>Bu Bağlantı Kullanılamıyor</h1>
        <p role="alert">{invalid}</p>
        <Link to="/admin/forgot-password" className="algSubmit">
          <span>Yeni Bağlantı İste</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </AdminAuthLayout>
    );
  }

  return (
    <AdminAuthLayout back={back}>
      <span className="algEyebrow">{invite ? 'Hesabınızı Etkinleştirin' : 'Şifre Sıfırlama'}</span>
      <h1>{invite ? 'Şifrenizi Belirleyin' : 'Yeni Şifre Belirleyin'}</h1>
      <p>
        {account?.name ? `Merhaba ${account.name}. ` : ''}
        <strong>{account?.email}</strong> hesabı için {invite ? 'giriş şifrenizi' : 'yeni şifrenizi'} belirleyin.
      </p>

      <form className="algForm" onSubmit={handleSubmit}>
        {/* Lets password managers save the new password for the right account */}
        <input type="email" name="username" autoComplete="username" value={account?.email || ''} readOnly hidden />

        <PasswordField variant="auth" label="Yeni Şifre" name="password" value={password} onChange={setPassword} rules />
        <PasswordField variant="auth" label="Yeni Şifre (Tekrar)" name="repeat" value={repeat} onChange={setRepeat} />
        {mismatch && <small className="algCaps">Şifreler aynı değil.</small>}

        {error && (
          <div className="algError" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="algSubmit" disabled={status === 'loading' || !passwordOk(password) || password !== repeat}>
          {status === 'loading' ? (
            <>
              <Loader2 className="algSpin" aria-hidden="true" />
              <span>Kaydediliyor…</span>
            </>
          ) : (
            <>
              <span>{invite ? 'Şifremi Kaydet ve Giriş Yap' : 'Şifreyi Kaydet ve Giriş Yap'}</span>
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AdminAuthLayout>
  );
}
