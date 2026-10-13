import { useCallback, useEffect, useState } from 'react';
import {
  Check, KeyRound, Mail, Power, Send, ShieldCheck, Trash2, UserPlus, Users, Wand2, X,
} from 'lucide-react';

import {
  changeOwnPassword, createAdminUser, deleteAdminUser, listAdminUsers, resetAdminUserPassword, updateAdminUser,
} from '../../services/adminApi';
import { getAdminUser, saveAdminSession } from '../../services/adminAuth';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { formatDate, timeAgo } from '../../components/admin/quoteStatus';
import PasswordField, { generatePassword, passwordOk } from '../../components/admin/PasswordField';

const emptyForm = { name: '', email: '', method: 'password', password: '' };

function initials(name, email) {
  const parts = String(name || email || '?').trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toLocaleUpperCase('tr');
}

/* Admin users: add (invitation e-mail or a password you choose), reset, deactivate, delete; own password */
export default function AdminUsers() {
  usePageTitle('Kullanıcılar');

  const call = useAdminApi();

  const [users, setUsers] = useState([]);
  const [mail, setMail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState('');
  const [resetFor, setResetFor] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [own, setOwn] = useState({ current: '', next: '', repeat: '' });

  const load = useCallback(async () => {
    try {
      setError('');
      const response = await call(listAdminUsers);
      setUsers(Array.isArray(response.data) ? response.data : []);
      setMail(Boolean(response.mail));
      // Invitation by default when e-mail works; without e-mail the only way is a password chosen here
      setForm((current) => (current.name || current.email || current.password
        ? current
        : { ...current, method: response.mail ? 'invite' : 'password' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load]);

  const replaceUser = (user) => setUsers((list) => list.map((item) => (item._id === user._id ? user : item)));

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function generateFor(setter) {
    const password = generatePassword();
    setter(password);
    const copied = await copy(password);
    setNotice({ type: 'info', text: `Oluşturulan şifre: ${password}${copied ? ' (panoya kopyalandı)' : ''}. Kişiye güvenli bir yoldan iletin.` });
  }

  async function addUser(event) {
    event.preventDefault();
    setSaving('add');
    setNotice(null);

    try {
      const invite = form.method === 'invite';
      const response = await call(createAdminUser, {
        name: form.name,
        email: form.email,
        invite,
        ...(invite ? {} : { password: form.password }),
      });

      setUsers((list) => [...list, response.data]);
      setForm({ ...emptyForm, method: mail ? 'invite' : 'password' });
      setAdding(false);
      setNotice(
        response.warning
          ? { type: 'error', text: response.warning }
          : {
              type: 'success',
              text: invite
                ? `${response.data.email} adresine davet gönderildi. Kişi bağlantıdan şifresini belirleyince giriş yapabilir (72 saat geçerli).`
                : `${response.data.name} eklendi. Giriş e-postası ve belirlediğiniz şifreyi kendisine güvenli bir yoldan iletin.`,
            }
      );
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

  async function toggleActive(user) {
    const next = !user.isActive;
    if (!next && !window.confirm(`${user.name} pasif yapılsın mı? Panele giriş yapamaz; açık oturumu da kapanır.`)) return;

    setSaving(`active-${user._id}`);
    setNotice(null);

    try {
      const response = await call(updateAdminUser, user._id, { isActive: next });
      replaceUser(response.data);
      setNotice({ type: 'success', text: next ? `${user.name} yeniden aktif.` : `${user.name} pasif yapıldı.` });
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

  async function remove(user) {
    if (!window.confirm(`${user.name} (${user.email}) kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;

    setSaving(`delete-${user._id}`);
    setNotice(null);

    try {
      await call(deleteAdminUser, user._id);
      setUsers((list) => list.filter((item) => item._id !== user._id));
      setNotice({ type: 'success', text: `${user.name} silindi.` });
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

  async function sendReset(user) {
    setSaving(`reset-${user._id}`);
    setNotice(null);

    try {
      const response = await call(resetAdminUserPassword, user._id, { send: true });
      replaceUser(response.data);
      setResetFor(null);
      setNotice({ type: 'success', text: response.message });
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

  async function setPasswordFor(event, user) {
    event.preventDefault();
    setSaving(`reset-${user._id}`);
    setNotice(null);

    try {
      const response = await call(resetAdminUserPassword, user._id, { password: resetPassword });
      replaceUser(response.data);
      setResetFor(null);
      setResetPassword('');
      setNotice({ type: 'success', text: response.message });
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

  async function changeOwn(event) {
    event.preventDefault();
    setSaving('own');
    setNotice(null);

    try {
      const response = await call(changeOwnPassword, own.current, own.next);
      // The old session is no longer valid: keep this browser signed in with the new token
      saveAdminSession(response.token, response.admin);
      setOwn({ current: '', next: '', repeat: '' });
      setNotice({ type: 'success', text: 'Şifreniz değiştirildi. Diğer cihazlardaki oturumlarınız kapandı.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

  const me = getAdminUser();
  const ownMismatch = own.repeat && own.next !== own.repeat;

  return (
    <section className="adminContent adUsers">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Ayarlar</span>
          <h1>Kullanıcılar</h1>
          <p>Panele giriş yapabilen kişiler. Her kullanıcı tüm bölümleri yönetebilir. Kimse kendi hesabını silemez veya pasif yapamaz; en az bir aktif yönetici her zaman kalır.</p>
        </div>
        <div className="adHeadActions">
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => setAdding((open) => !open)} aria-expanded={adding}>
            {adding ? <X aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
            {adding ? 'Vazgeç' : 'Kullanıcı Ekle'}
          </button>
        </div>
      </header>

      {!loading && !mail && (
        <div className="adInfo" role="note">
          <Mail aria-hidden="true" />
          <span>E-posta gönderimi (SMTP) ayarlı olmadığı için davet ve şifre sıfırlama e-postaları gönderilemiyor. Yeni kullanıcıların ve sıfırlanan hesapların şifresini burada siz belirleyin.</span>
        </div>
      )}

      {notice && (
        <div className={`adNotice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.type === 'error' ? <X aria-hidden="true" /> : <Check aria-hidden="true" />}
          <span>{notice.text}</span>
          <button type="button" className="adIconButton" onClick={() => setNotice(null)} aria-label="Kapat"><X aria-hidden="true" /></button>
        </div>
      )}

      {adding && (
        <form className="adCard adUserForm" onSubmit={addUser}>
          <div className="adCardHead"><h2><UserPlus aria-hidden="true" />Yeni Kullanıcı</h2></div>

          <div className="adUserFormGrid">
            <label className="cmsField">
              <span>Ad Soyad</span>
              <input value={form.name} maxLength={80} required placeholder="ör. Ayşe Yılmaz" onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label className="cmsField">
              <span>E-posta</span>
              <input type="email" value={form.email} maxLength={254} required placeholder="ayse@rmaplastik.com" autoComplete="off" onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
          </div>

          <div className="cmsField">
            <span>Şifre Nasıl Belirlensin?</span>
            <div className="adSegment adMethod" role="group" aria-label="Şifre belirleme yöntemi">
              <button type="button" className={form.method === 'invite' ? 'active' : ''} aria-pressed={form.method === 'invite'} disabled={!mail} onClick={() => setForm({ ...form, method: 'invite' })} title={mail ? undefined : 'E-posta gönderimi ayarlı değil'}>
                <Send aria-hidden="true" />
                Davet E-postası Gönder
              </button>
              <button type="button" className={form.method === 'password' ? 'active' : ''} aria-pressed={form.method === 'password'} onClick={() => setForm({ ...form, method: 'password' })}>
                <KeyRound aria-hidden="true" />
                Şifreyi Ben Belirleyeyim
              </button>
            </div>
            <small>
              {form.method === 'invite'
                ? 'Kişiye 72 saat geçerli bir bağlantı gider; şifresini kendisi belirler. Siz şifreyi hiç görmezsiniz.'
                : 'Belirlediğiniz şifreyi kişiye güvenli bir yoldan iletin; girişten sonra Kullanıcılar sayfasından değiştirebilir.'}
            </small>
          </div>

          {form.method === 'password' && (
            <PasswordField
              label="Şifre"
              value={form.password}
              onChange={(password) => setForm((current) => ({ ...current, password }))}
              rules
              extra={(
                <button type="button" className="adTextButton" onClick={() => generateFor((password) => setForm((current) => ({ ...current, password })))}>
                  <Wand2 aria-hidden="true" />
                  Şifre Oluştur
                </button>
              )}
            />
          )}

          <div className="adUserFormActions">
            <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving === 'add' || (form.method === 'password' && !passwordOk(form.password))}>
              {saving === 'add' ? 'Kaydediliyor…' : form.method === 'invite' ? 'Daveti Gönder' : 'Kullanıcıyı Ekle'}
            </button>
          </div>
        </form>
      )}

      <div className="adCard">
        <div className="adCardHead">
          <h2><Users aria-hidden="true" />Panel Kullanıcıları</h2>
          <span className="adHint">{users.length} kullanıcı</span>
        </div>

        {loading && <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1].map((i) => <span key={i} />)}</div>}
        {!loading && error && <div className="adminInlineError" role="alert">{error}</div>}

        {!loading && !error && (
          <ul className="adUserList">
            {users.map((user) => {
              const busy = saving.endsWith(user._id);
              const state = !user.isActive ? 'inactive' : user.invitePending ? 'pending' : 'active';

              return (
                <li key={user._id} className={`adUserRow ${state}`}>
                  <div className="adUserMain">
                    <span className="adAvatar" aria-hidden="true">{initials(user.name, user.email)}</span>
                    <span className="adUserIdentity">
                      <strong>
                        {user.name}
                        {user.self && <em className="adSelfTag">Siz</em>}
                      </strong>
                      <a href={`mailto:${user.email}`}>{user.email}</a>
                    </span>
                  </div>

                  <div className="adUserMeta">
                    <span className={`adPill tone-${state === 'active' ? 'green' : state === 'pending' ? 'amber' : 'gray'}`}>
                      {state === 'active' ? 'Aktif' : state === 'pending' ? 'Davet Bekliyor' : 'Pasif'}
                    </span>
                    <small title={user.lastLoginAt ? formatDate(user.lastLoginAt, true) : undefined}>
                      {user.lastLoginAt ? `Son giriş ${timeAgo(user.lastLoginAt)}` : 'Henüz giriş yapmadı'}
                    </small>
                  </div>

                  <div className="adUserActions">
                    <button
                      type="button"
                      className="cmsButton"
                      onClick={() => {
                        setResetFor(resetFor === user._id ? null : user._id);
                        setResetPassword('');
                      }}
                      aria-expanded={resetFor === user._id}
                      disabled={user.self}
                      title={user.self ? 'Kendi şifrenizi aşağıdan değiştirin' : undefined}
                    >
                      <KeyRound aria-hidden="true" />
                      {user.invitePending ? 'Davet' : 'Şifre'}
                    </button>
                    {!user.self && (
                      <>
                        <button type="button" className="cmsButton" onClick={() => toggleActive(user)} disabled={busy}>
                          <Power aria-hidden="true" />
                          {user.isActive ? 'Pasif Yap' : 'Aktif Et'}
                        </button>
                        <button type="button" className="adIconButton danger" onClick={() => remove(user)} disabled={busy} aria-label={`${user.name} kullanıcısını sil`} title="Sil">
                          <Trash2 aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>

                  {resetFor === user._id && (
                    <div className="adUserReset">
                      {mail && (
                        <div className="adUserResetOption">
                          <div>
                            <strong>{user.invitePending ? 'Daveti Yeniden Gönder' : 'Sıfırlama Bağlantısı Gönder'}</strong>
                            <small>{user.invitePending ? `${user.email} adresine 72 saat geçerli yeni bir davet gider.` : `${user.email} adresine 1 saat geçerli bir bağlantı gider; şifreyi kişi kendisi belirler.`}</small>
                          </div>
                          <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => sendReset(user)} disabled={busy}>
                            <Send aria-hidden="true" />
                            {busy ? 'Gönderiliyor…' : 'Gönder'}
                          </button>
                        </div>
                      )}

                      <form className="adUserResetOption withField" onSubmit={(event) => setPasswordFor(event, user)}>
                        <div className="adUserResetField">
                          <PasswordField
                            label="Ya da yeni şifreyi siz belirleyin"
                            value={resetPassword}
                            onChange={setResetPassword}
                            rules
                            extra={(
                              <button type="button" className="adTextButton" onClick={() => generateFor(setResetPassword)}>
                                <Wand2 aria-hidden="true" />
                                Şifre Oluştur
                              </button>
                            )}
                          />
                        </div>
                        <button type="submit" className="cmsButton" disabled={busy || !passwordOk(resetPassword)}>
                          <Check aria-hidden="true" />
                          Kaydet
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form className="adCard adOwnPassword" onSubmit={changeOwn}>
        <div className="adCardHead">
          <h2><ShieldCheck aria-hidden="true" />Şifremi Değiştir</h2>
          {me?.email && <span className="adHint">{me.email}</span>}
        </div>

        {/* Lets password managers update the saved password for this account */}
        <input type="email" name="username" autoComplete="username" value={me?.email || ''} readOnly hidden />

        <div className="adUserFormGrid three">
          <PasswordField label="Mevcut Şifre" value={own.current} onChange={(current) => setOwn({ ...own, current })} autoComplete="current-password" />
          <PasswordField label="Yeni Şifre" value={own.next} onChange={(next) => setOwn({ ...own, next })} rules />
          <PasswordField label="Yeni Şifre (Tekrar)" value={own.repeat} onChange={(repeat) => setOwn({ ...own, repeat })} />
        </div>
        {ownMismatch && <small className="algCaps">Şifreler aynı değil.</small>}

        <div className="adUserFormActions">
          <small className="cmsHint">Şifre değişince diğer cihazlardaki oturumlarınız kapanır.</small>
          <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving === 'own' || !own.current || !passwordOk(own.next) || own.next !== own.repeat}>
            {saving === 'own' ? 'Kaydediliyor…' : 'Şifreyi Değiştir'}
          </button>
        </div>
      </form>

    </section>
  );
}
