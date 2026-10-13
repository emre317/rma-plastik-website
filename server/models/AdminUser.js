import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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

    role: {
      type: String,
      enum: ['admin'],
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