import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/*
  Roles (client: components/admin/roles.js)
    admin    everything, incl. users, site settings and the activity log
    sales    quote requests, proformas, sales report, potential customers
    content  products, blog, projects, photos, FAQ, export network, videos, texts, publishing
  Every role can read the content lists and change its own password.
*/
export const ADMIN_ROLES = ['admin', 'sales', 'content'];

export const ROLE_AREAS = {
  admin: ['sales', 'content', 'settings', 'users', 'audit'],
  sales: ['sales'],
  content: ['content'],
};

export const roleCan = (role, area) => (ROLE_AREAS[role] || []).includes(area);

const adminUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    // Optional contact details, shown in the user list
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: 40,
    },

    title: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },

    role: {
      type: String,
      enum: ADMIN_ROLES,
      default: 'admin',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    // Sessions (JWTs) issued before this moment are no longer accepted
    passwordChangedAt: {
      type: Date,
      default: null,
    },

    // Password reset / invitation link: only the SHA-256 of the token is stored
    resetTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    resetTokenExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // Set when the account was created by invitation and no password was chosen yet
    invitePending: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

adminUserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(12);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );

  // Existing sessions end when an existing account changes its password
  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }
});

adminUserSchema.methods.comparePassword =
  async function (candidatePassword) {
    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };

const AdminUser = mongoose.model(
  'AdminUser',
  adminUserSchema
);

export default AdminUser;