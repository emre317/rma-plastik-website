import 'dotenv/config';

import mongoose from 'mongoose';

import AdminUser from '../models/AdminUser.js';

async function createAdmin() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI
    );

    const email =
      process.env.ADMIN_EMAIL
        ?.trim()
        .toLowerCase();

    const password =
      process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'ADMIN_EMAIL and ADMIN_PASSWORD are required.'
      );
    }

    if (password.length < 8) {
      throw new Error(
        'ADMIN_PASSWORD must be at least 8 characters.'
      );
    }

    const existing =
      await AdminUser.findOne({
        email,
      });

    if (existing) {
      console.log(
        'Admin already exists.'
      );

      process.exit(0);
    }

    await AdminUser.create({
      name: process.env.ADMIN_NAME || 'RMA Admin',
      email,
      password,
    });

    console.log(
      'Admin created successfully.'
    );

    process.exit(0);
  } catch (error) {
    console.error(error.message);

    process.exit(1);
  }
}

createAdmin();