import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';

function createToken(admin) {
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

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          'Email and password are required.',
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
          'Invalid email or password.',
      });
    }

    const passwordMatches =
      await admin.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email or password.',
      });
    }

    const token = createToken(admin);

    return res.json({
      success: true,

      token,

      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error(
      'Admin login error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Login failed.',
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