import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';
import {
  RESET_HOURS, canSendAccountMail, hashToken, issueResetToken, sendResetEmail,
} from '../services/accountEmail.js';

export const PASSWORD_MIN = 8;

/* "" when the password is acceptable, otherwise the reason (Turkish, shown in the panel) */
export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) return `Şifre en az ${PASSWORD_MIN} karakter olmalı.`;
  if (password.length > 128) return 'Şifre en fazla 128 karakter olabilir.';
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password) || !/\d/.test(password)) return 'Şifre en az bir harf ve bir rakam içermeli.';
  return '';
}

export const publicAdmin = (admin) => ({
  id: admin._id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
});

export function createToken(admin) {
  return jwt.sign(
    {
      id: admin._id,
      role: admin.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '8h',
    }
  );
}

export async function adminLogin(
  req,
  res
) {
  try {
    const {
      email,
      password,
    } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          'E-posta ve şifre gerekli.',
      });
    }

    const admin =
      await AdminUser.findOne({
        email: email.toLowerCase().trim(),
      });

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message:
          'E-posta veya şifre hatalı.',
      });
    }

    const passwordMatches =
      await admin.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          'E-posta veya şifre hatalı.',
      });
    }

    const token = createToken(admin);

    // Not critical: a failed write must not block the login
    AdminUser.updateOne({ _id: admin._id }, { lastLoginAt: new Date() }).catch(() => {});

    return res.json({
      success: true,

      token,

      admin: publicAdmin(admin),
    });
  } catch (error) {
    console.error(
      'Admin login error:',
      error
    );

    // Most often the database is not reachable
    const databaseDown = mongoose.connection.readyState !== 1;

    return res.status(databaseDown ? 503 : 500).json({
      success: false,
      message: databaseDown
        ? 'Veritabanına bağlanılamadı (MongoDB çalışıyor mu?). / Database is not reachable.'
        : 'Login failed.',
    });
  }
}

export async function getCurrentAdmin(
  req,
  res
) {
  return res.json({
    success: true,
    admin: req.admin,
  });
}

const GENERIC_RESET_MESSAGE = 'Bu e-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu (ve istenmeyen klasörünü) kontrol edin.';

/* PUBLIC: "Şifremi unuttum". The answer never says whether the address exists. */
export async function forgotPassword(req, res) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';

    if (!email) {
      return res.status(400).json({ success: false, message: 'E-posta adresinizi yazın.' });
    }

    if (!canSendAccountMail()) {
      return res.status(503).json({
        success: false,
        message: 'Şifre sıfırlama e-postası şu anda gönderilemiyor. Lütfen panelde yetkili bir yöneticiden şifrenizi sıfırlamasını isteyin.',
      });
    }

    const admin = await AdminUser.findOne({ email, isActive: true });

    if (admin) {
      const token = issueResetToken(admin, RESET_HOURS);
      await admin.save();
      await sendResetEmail(admin, token);
    }

    return res.json({ success: true, message: GENERIC_RESET_MESSAGE });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'İstek şu anda işlenemedi. Lütfen biraz sonra tekrar deneyin.' });
  }
}

async function userForToken(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;

  return AdminUser.findOne({
    resetTokenHash: hashToken(token),
    resetTokenExpires: { $gt: new Date() },
    isActive: true,
  }).select('+resetTokenHash +resetTokenExpires');
}

/* PUBLIC: is the link from the e-mail still valid? (shows the name on the form) */
export async function checkResetToken(req, res) {
  try {
    const admin = await userForToken(req.query.token);

    if (!admin) {
      return res.status(410).json({ success: false, message: 'Bağlantının süresi dolmuş ya da daha önce kullanılmış. Yeni bir bağlantı isteyin.' });
    }

    return res.json({ success: true, data: { name: admin.name, email: admin.email, invite: admin.invitePending } });
  } catch (error) {
    console.error('Check reset token error:', error);
    return res.status(500).json({ success: false, message: 'Bağlantı kontrol edilemedi.' });
  }
}

/* PUBLIC: new password from the e-mail link; signs the user in */
export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body || {};
    const problem = passwordProblem(password);

    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }

    const admin = await userForToken(token);

    if (!admin) {
      return res.status(410).json({ success: false, message: 'Bağlantının süresi dolmuş ya da daha önce kullanılmış. Yeni bir bağlantı isteyin.' });
    }

    admin.password = password;
    admin.resetTokenHash = null;
    admin.resetTokenExpires = null;
    admin.invitePending = false;
    admin.lastLoginAt = new Date();
    await admin.save();

    return res.json({ success: true, token: createToken(admin), admin: publicAdmin(admin) });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Şifre kaydedilemedi.' });
  }
}

/* ADMIN: change one's own password (other sessions of this user end) */
export async function changeOwnPassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};

    const admin = await AdminUser.findById(req.admin._id);

    if (!admin || !(await admin.comparePassword(String(currentPassword || '')))) {
      return res.status(400).json({ success: false, message: 'Mevcut şifre hatalı.' });
    }

    const problem = passwordProblem(newPassword);

    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }

    if (await admin.comparePassword(newPassword)) {
      return res.status(400).json({ success: false, message: 'Yeni şifre mevcut şifreyle aynı olamaz.' });
    }

    admin.password = newPassword;
    await admin.save();

    // A fresh token for this browser; older sessions are no longer accepted
    return res.json({ success: true, token: createToken(admin), admin: publicAdmin(admin) });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Şifre değiştirilemedi.' });
  }
}
