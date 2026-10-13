import crypto from 'node:crypto';
import mongoose from 'mongoose';

import AdminUser, { ADMIN_ROLES } from '../models/AdminUser.js';
import { passwordProblem } from './authController.js';
import {
  INVITE_HOURS, RESET_HOURS, canSendAccountMail, issueResetToken, sendInviteEmail, sendResetEmail,
} from '../services/accountEmail.js';

/*
  Admin users (Kullanıcılar), each with a role (models/AdminUser.js). Nobody can
  deactivate, delete or change the role of their own account, and at least
  one active account with the admin role always stays.
*/

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const notFound = (res) => res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });

function row(user, selfId) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || 'admin',
    isActive: user.isActive,
    invitePending: Boolean(user.invitePending),
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
    self: String(user._id) === String(selfId),
  };
}

// Other active accounts with the admin role
async function otherActiveAdmins(id) {
  return AdminUser.countDocuments({ _id: { $ne: id }, isActive: true, role: 'admin' });
}

const isActiveAdmin = (user) => user.isActive && (user.role || 'admin') === 'admin';

const LAST_ADMIN = 'En az bir aktif Yönetici kalmalı.';

export async function listUsers(req, res) {
  try {
    const users = await AdminUser.find().sort({ createdAt: 1 }).lean();

    return res.json({
      success: true,
      data: users.map((user) => row(user, req.admin._id)),
      mail: canSendAccountMail(),
    });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ success: false, message: 'Kullanıcılar yüklenemedi.' });
  }
}

/* { name, email, invite: true } sends a link to choose a password; otherwise { password } is set directly */
export async function createUser(req, res) {
  try {
    const body = req.body || {};
    const name = clean(body.name, 80);
    const email = clean(body.email, 254).toLowerCase();
    const invite = body.invite === true;
    const role = ADMIN_ROLES.includes(body.role) ? body.role : 'sales';

    if (!name) return res.status(400).json({ success: false, message: 'Ad soyad yazın.' });
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ success: false, message: 'Geçerli bir e-posta adresi yazın.' });

    if (await AdminUser.exists({ email })) {
      return res.status(409).json({ success: false, message: 'Bu e-posta adresiyle bir kullanıcı zaten var.' });
    }

    if (invite && !canSendAccountMail()) {
      return res.status(400).json({ success: false, message: 'E-posta gönderimi ayarlı olmadığı için davet gönderilemiyor. Şifreyi kendiniz belirleyin.' });
    }

    let password = body.password;

    if (invite) {
      // Unknown random password until the invited person chooses one
      password = crypto.randomBytes(24).toString('base64url');
    } else {
      const problem = passwordProblem(password);
      if (problem) return res.status(400).json({ success: false, message: problem });
    }

    const user = new AdminUser({ name, email, password, role, invitePending: invite });
    const token = invite ? issueResetToken(user, INVITE_HOURS) : null;
    await user.save();

    if (invite) {
      try {
        await sendInviteEmail(user, token, req.admin?.name);
      } catch (error) {
        console.error('Invite email error:', error);
        return res.status(201).json({
          success: true,
          data: row(user, req.admin._id),
          warning: 'Kullanıcı eklendi ancak davet e-postası gönderilemedi. Listeden "Daveti Yeniden Gönder"i deneyin.',
        });
      }
    }

    return res.status(201).json({ success: true, data: row(user, req.admin._id) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Bu e-posta adresiyle bir kullanıcı zaten var.' });
    }

    console.error('Create user error:', error);
    return res.status(500).json({ success: false, message: 'Kullanıcı eklenemedi.' });
  }
}

/* { name }, { role } and / or { isActive } */
export async function updateUser(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const user = await AdminUser.findById(req.params.id);
    if (!user) return notFound(res);

    const body = req.body || {};

    if (body.name !== undefined) {
      const name = clean(body.name, 80);
      if (!name) return res.status(400).json({ success: false, message: 'Ad soyad boş olamaz.' });
      user.name = name;
    }

    if (body.role !== undefined) {
      if (!ADMIN_ROLES.includes(body.role)) {
        return res.status(400).json({ success: false, message: 'Geçersiz rol.' });
      }

      if (String(user._id) === String(req.admin._id) && body.role !== user.role) {
        return res.status(400).json({ success: false, message: 'Kendi rolünüzü değiştiremezsiniz.' });
      }

      if (body.role !== 'admin' && isActiveAdmin(user) && (await otherActiveAdmins(user._id)) === 0) {
        return res.status(400).json({ success: false, message: LAST_ADMIN });
      }

      user.role = body.role;
    }

    if (body.isActive !== undefined) {
      const isActive = body.isActive === true;

      if (!isActive && String(user._id) === String(req.admin._id)) {
        return res.status(400).json({ success: false, message: 'Kendi hesabınızı pasif yapamazsınız.' });
      }

      if (!isActive && isActiveAdmin(user) && (await otherActiveAdmins(user._id)) === 0) {
        return res.status(400).json({ success: false, message: LAST_ADMIN });
      }

      user.isActive = isActive;
    }

    await user.save();

    return res.json({ success: true, data: row(user, req.admin._id) });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ success: false, message: 'Kullanıcı güncellenemedi.' });
  }
}

/*
  Another user's password: { send: true } e-mails a reset (or a new invitation
  if they never chose a password); { password } sets it directly.
*/
export async function resetUserPassword(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const user = await AdminUser.findById(req.params.id);
    if (!user) return notFound(res);

    if (req.body?.send === true) {
      if (!canSendAccountMail()) {
        return res.status(400).json({ success: false, message: 'E-posta gönderimi ayarlı değil. Yeni şifreyi kendiniz belirleyin.' });
      }

      const token = issueResetToken(user, user.invitePending ? INVITE_HOURS : RESET_HOURS);
      await user.save();

      if (user.invitePending) await sendInviteEmail(user, token, req.admin?.name);
      else await sendResetEmail(user, token);

      return res.json({
        success: true,
        data: row(user, req.admin._id),
        message: user.invitePending ? `Davet ${user.email} adresine yeniden gönderildi.` : `Şifre sıfırlama bağlantısı ${user.email} adresine gönderildi.`,
      });
    }

    const problem = passwordProblem(req.body?.password);
    if (problem) return res.status(400).json({ success: false, message: problem });

    user.password = req.body.password;
    user.invitePending = false;
    user.resetTokenHash = null;
    user.resetTokenExpires = null;
    await user.save();

    return res.json({
      success: true,
      data: row(user, req.admin._id),
      message: `${user.name} için yeni şifre kaydedildi. Şifreyi kendisine güvenli bir yoldan iletin; açık oturumları kapandı.`,
    });
  } catch (error) {
    console.error('Reset user password error:', error);
    return res.status(500).json({ success: false, message: 'Şifre sıfırlanamadı.' });
  }
}

export async function deleteUser(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    if (String(req.params.id) === String(req.admin._id)) {
      return res.status(400).json({ success: false, message: 'Kendi hesabınızı silemezsiniz.' });
    }

    const user = await AdminUser.findById(req.params.id);
    if (!user) return notFound(res);

    if (isActiveAdmin(user) && (await otherActiveAdmins(user._id)) === 0) {
      return res.status(400).json({ success: false, message: LAST_ADMIN });
    }

    await user.deleteOne();

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ success: false, message: 'Kullanıcı silinemedi.' });
  }
}
