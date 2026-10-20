import { useCallback, useEffect, useState } from 'react';
import {
  Check, KeyRound, Mail, Pencil, Phone, Power, Send, Trash2, UserPlus, Users, Wand2, X,
} from 'lucide-react';

import {
  createAdminUser, deleteAdminUser, listAdminUsers, resetAdminUserPassword, updateAdminUser,
} from '../../services/adminApi';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { formatDate, timeAgo } from '../../components/admin/quoteStatus';
import PasswordField, { generatePassword, passwordOk } from '../../components/admin/PasswordField';
import Dropdown from '../../components/ui/Dropdown';
import { ROLES, roleLabel, roleTone } from '../../components/admin/roles';
import { useAdminSession } from '../../components/admin/AdminSession';
import { useConfirm } from '../../components/ui/ConfirmDialog';

const emptyForm = { name: '', email: '', title: '', phone: '', method: 'password', password: '', role: 'sales' };

const INFO_FIELDS = ['name', 'email', 'title', 'phone'];

const infoOf = (user) => ({ name: user.name || '', email: user.email || '', title: user.title || '', phone: user.phone || '' });

/* Ad Soyad, E-posta, Unvan, Telefon: used by the add and the edit forms */
function InfoFields({ value, onChange, autoFocus }) {
  const set = (key) => (event) => onChange({ ...value, [key]: event.target.value });

  return (
    <div className="adUserFormGrid">
      <label className="cmsField">
        <span>Ad Soyad</span>
        <input value={value.name} maxLength={80} required placeholder="ör. Ayşe Yılmaz" autoFocus={autoFocus} onChange={set('name')} />
      </label>
      <label className="cmsField">
        <span>E-posta</span>
        <input type="email" value={value.email} maxLength={254} required placeholder="ayse@rmaplastik.com" autoComplete="off" onChange={set('email')} />
      </label>
      <label className="cmsField">
        <span>Unvan (isteğe bağlı)</span>
        <input value={value.title} maxLength={80} placeholder="ör. Satış Temsilcisi" onChange={set('title')} />
      </label>
      <label className="cmsField">
        <span>Telefon (isteğe bağlı)</span>
        <input type="tel" value={value.phone} maxLength={40} placeholder="+90 5xx xxx xx xx" autoComplete="off" onChange={set('phone')} />
      </label>
    </div>
  );
}

const roleOptions = ROLES.map((role) => ({ value: role.id, label: role.label, hint: role.text }));

function initials(name, email) {
  const parts = String(name || email || '?').trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toLocaleUpperCase('tr');
}

/* Admin users: add (invitation e-mail or a password you choose), edit details, role, reset, deactivate, delete */
export default function AdminUsers() {
  usePageTitle('Kullanıcılar');

  const call = useAdminApi();
  const confirm = useConfirm();
  const { updateAdmin } = useAdminSession();

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
  const [editFor, setEditFor] = useState(null);
  const [editForm, setEditForm] = useState(infoOf({}));

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

  function openEdit(user) {
    const open = editFor !== user._id;
    setEditFor(open ? user._id : null);
    setEditForm(infoOf(user));
    if (open) setResetFor(null);
  }

  async function saveInfo(event, user) {
    event.preventDefault();

    const before = infoOf(user);
    // Only what changed, so the activity log names exactly that
    const changed = Object.fromEntries(INFO_FIELDS
      .filter((key) => editForm[key].trim() !== (key === 'email' ? before[key].toLowerCase() : before[key]))
      .map((key) => [key, editForm[key]]));

    if (!Object.keys(changed).length) {
      setEditFor(null);
      return;
    }

    setSaving(`edit-${user._id}`);
    setNotice(null);

    try {
      const response = await call(updateAdminUser, user._id, changed);
      replaceUser(response.data);
      if (response.data.self) updateAdmin(response.data);
      setEditFor(null);

      const parts = [`${response.data.name} bilgileri güncellendi.`];
      if (changed.email && response.data.self) parts.push('Bundan sonra panele yeni e-posta adresinizle giriş yapın.');
      else if (changed.email) parts.push(`Panele artık ${response.data.email} adresiyle giriş yapacak.`);
      if (changed.email && user.invitePending) parts.push('Önceki davet bağlantısı geçersiz oldu; "Davet" butonundan yeni adrese yeniden gönderin.');
      if (changed.name && user.name !== response.data.name) parts.push('Sorumlusu olduğu teklif talepleri ve satış hedefleri yeni adla güncellendi.');
      setNotice({ type: 'success', text: parts.join(' ') });
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

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
        title: form.title,
        phone: form.phone,
        role: form.role,
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

  async function changeRole(user, role) {
    if (role === user.role) return;
    setSaving(`role-${user._id}`);
    setNotice(null);

    try {
      const response = await call(updateAdminUser, user._id, { role });
      replaceUser(response.data);
      setNotice({ type: 'success', text: `${user.name} artık ${roleLabel(role)} rolünde.` });
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

  async function toggleActive(user) {
    const next = !user.isActive;
    if (!next && !(await confirm({ title: `${user.name} pasif yapılsın mı?`, message: 'Panele giriş yapamaz; açık oturumu da kapanır. İstediğiniz zaman yeniden aktif edebilirsiniz.', confirmLabel: 'Pasif Yap', tone: 'warning' }))) return;

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
    if (!(await confirm({ title: 'Kullanıcı silinsin mi?', message: `${user.name} (${user.email}) kalıcı olarak silinir; bu işlem geri alınamaz.`, confirmLabel: 'Kullanıcıyı Sil', tone: 'danger' }))) return;

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


  return (
    <section className="adminContent adUsers">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Ayarlar</span>
          <h1>Kullanıcılar</h1>
          <p>Panele giriş yapabilen kişiler ve rolleri. Bilgileri "Düzenle" ile güncelleyebilirsiniz. Kimse kendi hesabını silemez, pasif yapamaz veya rolünü değiştiremez; en az bir aktif Yönetici her zaman kalır.</p>
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

          <InfoFields value={form} onChange={(info) => setForm((current) => ({ ...current, ...info }))} />

          <div className="cmsField">
            <span>Rol</span>
            <Dropdown value={form.role} onChange={(role) => setForm({ ...form, role })} label="Rol" options={roleOptions} />
            <small>{ROLES.find((role) => role.id === form.role)?.text}</small>
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
                      {user.title && <span className="adUserTitle">{user.title}</span>}
                      <a href={`mailto:${user.email}`}>{user.email}</a>
                      {user.phone && (
                        <a className="adUserPhone" href={`tel:${user.phone.replace(/[^\d+]/g, '')}`}>
                          <Phone aria-hidden="true" />
                          {user.phone}
                        </a>
                      )}
                    </span>
                  </div>

                  <div className="adUserMeta">
                    <span className="adUserPills">
                      <span className={`adPill tone-${roleTone(user.role)}`}>{roleLabel(user.role)}</span>
                      <span className={`adPill tone-${state === 'active' ? 'green' : state === 'pending' ? 'amber' : 'gray'}`}>
                        {state === 'active' ? 'Aktif' : state === 'pending' ? 'Davet Bekliyor' : 'Pasif'}
                      </span>
                    </span>
                    <small title={user.lastLoginAt ? formatDate(user.lastLoginAt, true) : undefined}>
                      {user.lastLoginAt ? `Son giriş ${timeAgo(user.lastLoginAt)}` : 'Henüz giriş yapmadı'}
                    </small>
                  </div>

                  <div className="adUserActions">
                    <button type="button" className="cmsButton" onClick={() => openEdit(user)} aria-expanded={editFor === user._id}>
                      <Pencil aria-hidden="true" />
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="cmsButton"
                      onClick={() => {
                        setResetFor(resetFor === user._id ? null : user._id);
                        setResetPassword('');
                        setEditFor(null);
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
                        <Dropdown
                          className="adRoleDd"
                          value={user.role}
                          onChange={(role) => changeRole(user, role)}
                          label={`${user.name} rolü`}
                          options={roleOptions}
                          align="end"
                        />
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

                  {editFor === user._id && (
                    <form className="adUserReset adUserEdit" onSubmit={(event) => saveInfo(event, user)}>
                      <strong>Bilgileri Düzenle</strong>
                      <InfoFields value={editForm} onChange={setEditForm} autoFocus />
                      <small className="cmsHint">
                        {user.self
                          ? 'E-postanızı değiştirirseniz panele bundan sonra yeni adresle giriş yaparsınız.'
                          : 'E-posta, panele giriş adresidir; değişirse kişi yeni adresle giriş yapar. Rol ve aktiflik satırdaki butonlardan değişir.'}
                      </small>
                      <div className="adUserFormActions">
                        <button type="button" className="cmsButton" onClick={() => setEditFor(null)}>Vazgeç</button>
                        <button type="submit" className="cmsButton cmsButtonPrimary" disabled={busy || !editForm.name.trim() || !editForm.email.trim()}>
                          <Check aria-hidden="true" />
                          {busy ? 'Kaydediliyor…' : 'Kaydet'}
                        </button>
                      </div>
                    </form>
                  )}

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


    </section>
  );
}
