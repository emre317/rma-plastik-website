import express from 'express';

import {
  adminLogin,
  changeOwnPassword,
  checkResetToken,
  forgotPassword,
  getCurrentAdmin,
  resetPassword,
} from '../controllers/authController.js';

import {
  requireAdmin,
} from '../middleware/authMiddleware.js';

import {
  loginLimiter,
  passwordResetLimiter,
} from '../middleware/rateLimit.js';

const router = express.Router();

router.post(
  '/login',
  loginLimiter,
  adminLogin
);

router.get(
  '/me',
  requireAdmin,
  getCurrentAdmin
);

/* Password reset by e-mail (also used by invitation links) */
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.get('/reset-password', passwordResetLimiter, checkResetToken);
router.post('/reset-password', passwordResetLimiter, resetPassword);

router.put('/password', requireAdmin, changeOwnPassword);

export default router;
