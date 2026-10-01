import express from 'express';

import {
  adminLogin,
  getCurrentAdmin,
} from '../controllers/authController.js';

import {
  requireAdmin,
} from '../middleware/authMiddleware.js';

import {
  loginLimiter,
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

export default router;
