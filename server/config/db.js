import mongoose from 'mongoose';

/*
  MongoDB (Atlas in production) connection.

  - MONGODB_URI comes from the environment only. A mongodb+srv:// Atlas
    address uses TLS automatically; MONGODB_TLS=true forces it for a plain
    mongodb:// address.
  - The first connection is retried with a growing pause instead of exiting:
    on shared hosting (Passenger) a crashed app is restarted again and again,
    while a running app can answer /api/health with "DEGRADED" and recover on
    its own once Atlas is reachable (e.g. after its IP access list is fixed).
  - Later drops are logged; the driver reconnects by itself. Requests that hit
    the database meanwhile fail after a few seconds (bufferTimeoutMS) instead
    of hanging.
*/

const MAX_POOL = Number(process.env.MONGODB_MAX_POOL) || 10;

let started = false;

// Never print the password part of the address
export function redactUri(uri = '') {
  return String(uri).replace(/\/\/([^@/]+)@/, '//***@');
}

function options() {
  return {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    // CloudLinux limits processes per account: keep the pool small
    maxPoolSize: MAX_POOL,
    minPoolSize: 0,
    retryWrites: true,
    ...(process.env.MONGODB_TLS === 'true' ? { tls: true } : {}),
    ...(process.env.MONGODB_DB_NAME ? { dbName: process.env.MONGODB_DB_NAME } : {}),
  };
}

function watchConnection() {
  const { connection } = mongoose;

  connection.on('disconnected', () => console.warn('[db] MongoDB disconnected; the driver will reconnect.'));
  connection.on('reconnected', () => console.log('[db] MongoDB reconnected.'));
  connection.on('error', (error) => console.error('[db] MongoDB error:', error.message));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
  Resolves once connected. With `{ wait: false }` the retries continue in the
  background and the function returns at once (the API starts, /api/health
  reports the database state).
*/
export async function connectDatabase({ wait = true } = {}) {
  if (started) return mongoose.connection;
  started = true;

  mongoose.set('bufferTimeoutMS', 8000);
  watchConnection();

  const attempt = async () => {
    for (let i = 1; ; i += 1) {
      try {
        const connection = await mongoose.connect(process.env.MONGODB_URI, options());
        console.log(`[db] MongoDB connected: ${connection.connection.host}/${connection.connection.name}`);
        return connection;
      } catch (error) {
        const pause = Math.min(60, 5 * i);
        console.error(`[db] MongoDB connection failed (attempt ${i}, ${redactUri(process.env.MONGODB_URI)}): ${error.message}. Retrying in ${pause}s.`);
        await sleep(pause * 1000);
      }
    }
  };

  if (wait) return attempt();

  attempt();
  return mongoose.connection;
}

export function databaseState() {
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
}

export async function closeDatabase() {
  await mongoose.connection.close().catch(() => {});
}
