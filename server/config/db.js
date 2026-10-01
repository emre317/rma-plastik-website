import mongoose from 'mongoose';

export async function connectDatabase() {
  try {
    const connection = await mongoose.connect(
      process.env.MONGODB_URI
    );

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );
  } catch (error) {
    console.error(
      'MongoDB connection error:',
      error.message
    );

    process.exit(1);
  }
}