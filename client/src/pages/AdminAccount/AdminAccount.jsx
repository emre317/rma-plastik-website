import { useState } from 'react';
import { Check, ShieldCheck, UserRound, X } from 'lucide-react';

import { changeOwnPassword } from '../../services/adminApi';
import { saveAdminSession } from '../../services/adminAuth';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { useAdminSession } from '../../components/admin/AdminSession';
import { ROLES, roleLabel, roleTone } from '../../components/admin/roles';
import PasswordField, { passwordOk } from '../../components/admin/PasswordField';

/* The signed-in user's own account: role and password (open to every role) */
export default function AdminAccount() {
  usePageTitle('Hesabım');

  const call = useAdminApi();
  const { admin } = useAdminSession();

  const [own, setOwn] = useState({ current: '', next: '', repeat: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  async function changeOwn(event) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    try {
      const response = await call(changeOwnPassword, own.current, own.next);
      // The old session is no longer valid: keep this browser signed in with the new token
      saveAdminSession(response.token, { ...response.admin, role: response.admin.role || admin?.role });
      setOwn({ current: '', next: '', repeat: '' });
      setNotice({ type: 'success', text: 'Şifreniz değiştirildi. Diğer cihazlardaki oturumlarınız kapandı.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const mismatch = own.repeat && own.next !== own.repeat;
  const role = ROLES.find((item) => item.id === (admin?.role || 'admin'));

  return (
    <section className="adminContent adUsers">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Hesap</span>
          <h1>Hesabım</h1>
          <p>Giriş bilgileriniz ve rolünüz. Adınızı, e-postanızı veya rolünüzü bir Yönetici Kullanıcılar sayfasından değiştirebilir.</p>
        </div>
      </header>

      {notice && (
        <div className={`adNotice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.type === 'error' ? <X aria-hidden="true" /> : <Check aria-hidden="true" />}
          <span>{notice.text}</span>
          <button type="button" className="adIconButton" onClick={() => setNotice(null)} aria-label="Kapat"><X aria-hidden="true" /></button>
        </div>
      )}

      <div className="adCard adAccountCard">
        <div className="adCardHead"><h2><UserRound aria-hidden="true" />Hesap Bilgileri</h2></div>
        <dl className="adFacts">
          <div><dt>Ad Soyad</dt><dd>{admin?.name || '—'}</dd></div>
          <div><dt>E-posta</dt><dd>{admin?.email || '—'}</dd></div>
          <div>
            <dt>Rol</dt>
            <dd><span className={`adPill tone-${roleTone(role?.id)}`}>{roleLabel(role?.id)}</span></dd>
          </div>
        </dl>
        {role && <p className="cmsHint">{role.text}</p>}
      </div>

      <form className="adCard adOwnPassword" onSubmit={changeOwn}>
        <div className="adCardHead"><h2><ShieldCheck aria-hidden="true" />Şifremi Değiştir</h2></div>

        {/* Lets password managers update the saved password for this account */}
        <input type="email" name="username" autoComplete="username" value={admin?.email || ''} readOnly hidden />

        <div className="adUserFormGrid three">
          <PasswordField label="Mevcut Şifre" value={own.current} onChange={(current) => setOwn({ ...own, current })} autoComplete="current-password" />
          <PasswordField label="Yeni Şifre" value={own.next} onChange={(next) => setOwn({ ...own, next })} rules />
          <PasswordField label="Yeni Şifre (Tekrar)" value={own.repeat} onChange={(repeat) => setOwn({ ...own, repeat })} />
        </div>
        {mismatch && <small className="algCaps">Şifreler aynı değil.</small>}

        <div className="adUserFormActions">
          <small className="cmsHint">Şifre değişince diğer cihazlardaki oturumlarınız kapanır.</small>
          <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving || !own.current || !passwordOk(own.next) || own.next !== own.repeat}>
            {saving ? 'Kaydediliyor…' : 'Şifreyi Değiştir'}
          </button>
        </div>
      </form>
    </section>
  );
}
