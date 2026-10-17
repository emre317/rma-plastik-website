import jwt from 'jsonwebtoken';
import AdminUser, { roleCan } from '../models/AdminUser.js';

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

/* Use after requireAdmin: only these roles (e.g. requireRole('admin')) */
export function requireRole(...roles) {
  return (req, res, next) => {
    // Accounts saved before roles existed are admins
    if (roles.includes(req.admin?.role || 'admin')) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Bu işlemi yalnızca Yönetici rolündeki kullanıcılar yapabilir.',
    });
  };
}

/* Use after requireAdmin: the user's role must include one of the areas */
export function requirePermission(...areas) {
  return (req, res, next) => {
    if (areas.some((area) => roleCan(req.admin?.role, area))) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Bu işlem için yetkiniz yok. Gerekirse bir yöneticiden rolünüzü değiştirmesini isteyin.',
    });
  };
}
