import crypto from 'node:crypto';

import { emailLogo, isMailConfigured, sendMail } from './mailer.js';

/*
  Admin account links: password reset ("Şifremi unuttum", or sent by another
  admin) and invitations for new users. Only the SHA-256 hash of the token is
  saved; the link works once and expires.
*/

export const RESET_HOURS = 1;
export const INVITE_HOURS = 72;

export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/* Sets a new token on the user document (not saved) and returns the raw token */
export function issueResetToken(user, hours) {
  const token = crypto.randomBytes(32).toString('hex');
  user.resetTokenHash = hashToken(token);
  user.resetTokenExpires = new Date(Date.now() + hours * 3600 * 1000);
  return token;
}

function adminOrigin() {
  const origin = (process.env.CLIENT_URL || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)[0];

  return origin ? origin.replace(/\/$/, '') : '';
}

export function resetLink(token, invite = false) {
  const origin = adminOrigin();
  if (!origin) return '';
  return `${origin}/admin/reset-password?token=${encodeURIComponent(token)}${invite ? '&invite=1' : ''}`;
}

export const canSendAccountMail = () => isMailConfigured() && Boolean(adminOrigin());

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function layout({ title, intro, button, link, note }) {
  const html = `<!doctype html>
<html lang="tr">
  <body style="margin:0;padding:0;background:#f7f9fa;font-family:Arial,Helvetica,sans-serif;color:#101317;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fa;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr><td style="background:#101317;border-bottom:4px solid #e4173a;padding:22px 28px;color:#ffffff;font-size:13px;font-weight:bold;">${emailLogo()}<div style="margin-top:8px;color:#afb7c1;letter-spacing:0.06em;text-transform:uppercase;font-size:11px;">Yönetim Paneli</div></td></tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px;font-size:21px;line-height:1.3;">${escapeHtml(title)}</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#414a56;">${intro}</p>
                <p style="margin:0 0 22px;">
                  <a href="${escapeHtml(link)}" style="display:inline-block;padding:13px 22px;border-radius:12px;background:#e4173a;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">${escapeHtml(button)}</a>
                </p>
                <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#5c6673;">${escapeHtml(note)}</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#818b98;word-break:break-all;">${escapeHtml(link)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [title, '', intro.replace(/<[^>]+>/g, ''), '', `${button}: ${link}`, '', note].join('\n');

  return { html, text };
}

export function sendResetEmail(user, token) {
  const link = resetLink(token);
  const { html, text } = layout({
    title: 'Şifre Sıfırlama',
    intro: `Merhaba ${escapeHtml(user.name)}, yönetim paneli hesabınız (<strong>${escapeHtml(user.email)}</strong>) için şifre sıfırlama istendi.`,
    button: 'Yeni Şifre Belirle',
    link,
    note: `Bağlantı ${RESET_HOURS} saat geçerlidir ve bir kez kullanılabilir. Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz; şifreniz değişmez.`,
  });

  return sendMail({ to: user.email, subject: 'RMA Plastik yönetim paneli – şifre sıfırlama', html, text });
}

export function sendInviteEmail(user, token, invitedBy) {
  const link = resetLink(token, true);
  const { html, text } = layout({
    title: 'Yönetim Paneline Davet',
    intro: `Merhaba ${escapeHtml(user.name)}, ${invitedBy ? `<strong>${escapeHtml(invitedBy)}</strong> sizi` : 'Sizi'} RMA Plastik yönetim paneline ekledi. Giriş e-postanız: <strong>${escapeHtml(user.email)}</strong>. Aşağıdaki bağlantıdan şifrenizi belirleyerek hesabınızı etkinleştirin.`,
    button: 'Şifremi Belirle',
    link,
    note: `Bağlantı ${INVITE_HOURS} saat geçerlidir ve bir kez kullanılabilir.`,
  });

  return sendMail({ to: user.email, subject: 'RMA Plastik yönetim paneline davet edildiniz', html, text });
}
