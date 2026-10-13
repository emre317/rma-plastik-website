import express from 'express';

import {
  createUser, deleteUser, listUsers, resetUserPassword, updateUser,
} from '../controllers/userController.js';
import { requireAdmin, requirePermission } from '../middleware/authMiddleware.js';
import AdminUser from '../models/AdminUser.js';
import { audit } from '../services/audit.js';

const ROLE = { admin: 'Yönetici', sales: 'Satış', content: 'İçerik' };

const userAudit = (action, details) => audit({ area: 'users', type: 'user', action, lookup: AdminUser, details });

// "Rol: Satış → İçerik · Pasif yapıldı"
function changes(req, data, before) {
  const body = req.body || {};
  const parts = [];
  if (body.role !== undefined && before && body.role !== before.role) parts.push(`Rol: ${ROLE[before.role] || before.role} → ${ROLE[body.role] || body.role}`);
  if (body.isActive !== undefined && before && body.isActive !== before.isActive) parts.push(body.isActive ? 'Aktif edildi' : 'Pasif yapıldı');
  if (body.name !== undefined && before && body.name.trim() !== before.name) parts.push(`Ad: ${before.name} → ${body.name.trim()}`);
  return parts.join(' · ');
}

const router = express.Router();

router.use(requireAdmin, requirePermission('users'));

router.get('/', listUsers);
router.post('/', userAudit('Kullanıcı ekledi', (req) => `Rol: ${ROLE[req.body?.role] || 'Satış'} · ${req.body?.invite ? 'Davet e-postasıyla' : 'Şifre belirlenerek'}`), createUser);
router.patch('/:id', userAudit('Kullanıcıyı güncelledi', changes), updateUser);
router.post('/:id/password', userAudit((req, data, before) => (req.body?.send ? (before?.invitePending ? 'Daveti yeniden gönderdi' : 'Şifre sıfırlama bağlantısı gönderdi') : 'Kullanıcının şifresini belirledi')), resetUserPassword);
router.delete('/:id', userAudit('Kullanıcıyı sildi'), deleteUser);

export default router;
