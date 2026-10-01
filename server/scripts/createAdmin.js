import 'dotenv/config';

import mongoose from 'mongoose';

import AdminUser from '../models/AdminUser.js';

async function createAdmin() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI
    );

    const email =
      process.env.ADMIN_EMAIL;

    const password =
      process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'ADMIN_EMAIL and ADMIN_PASSWORD are required.'
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
      name: 'RMA Admin',
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