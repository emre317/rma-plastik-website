import express from 'express';

import {
  createUser, deleteUser, listUsers, resetUserPassword, updateUser,
} from '../controllers/userController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAdmin);

router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.post('/:id/password', resetUserPassword);
router.delete('/:id', deleteUser);

export default router;
