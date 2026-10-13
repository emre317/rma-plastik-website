import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';

export async function requireAdmin(
  req,
  res,
  next
) {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const token =
      authorization.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const admin = await AdminUser.findById(
      decoded.id
    ).select('-password');

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin account.',
      });
    }

    // Password changed after this session started (1 s tolerance for the new token)
    if (admin.passwordChangedAt && decoded.iat * 1000 < admin.passwordChangedAt.getTime() - 1000) {
      return res.status(401).json({
        success: false,
        message: 'Session expired after a password change.',
      });
    }

    req.admin = admin;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}