import 'dotenv/config';

import app from './app.js';
import { connectDatabase } from './config/db.js';


/* =====================================================
   ENVIRONMENT
===================================================== */

const requiredEnv = [
  'MONGODB_URI',
  'JWT_SECRET',
];

const missingEnv = requiredEnv.filter(
  (key) => !process.env[key]
);

if (missingEnv.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnv.join(', ')}`
  );

  process.exit(1);
}

const PORT = process.env.PORT || 5000;


/* =====================================================
   DATABASE
===================================================== */

await connectDatabase();


/* =====================================================
   SERVER
===================================================== */

app.listen(PORT, () => {
  console.log(
    `RMA API running on http://localhost:${PORT}`
  );
});
