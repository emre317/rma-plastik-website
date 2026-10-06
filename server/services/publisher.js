import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getSiteSettings } from '../models/SiteSettings.js';

/*
  "Publish" rebuilds the public site with the current database content:
    1. client `npm run build` into dist-next (content fetched from /api/content)
    2. swap: dist -> dist-prev, dist-next -> dist
  The live site keeps serving the old build until the swap, so visitors never
  see a half-built site. One build runs at a time. On failure the output is
  printed to the server console and shown in the admin panel.
*/

const serverRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLIENT_DIR = path.resolve(process.env.CLIENT_DIR || path.join(serverRoot, '..', 'client'));

// Server secrets are not needed by the site build, so they are not passed on
const SECRET_KEYS = /^(MONGODB_URI|JWT_SECRET|SMTP_|MAIL_|QUOTE_NOTIFY_TO|ADMIN_)/i;

const state = {
  status: 'idle', // idle | running | success | failed
  startedAt: null,
  finishedAt: null,
  error: '',
  log: '',
};

export function getPublishState() {
  return { ...state };
}

function appendLog(chunk) {
  state.log = (state.log + chunk.toString()).slice(-8000);
}

function fail(message) {
  Object.assign(state, { status: 'failed', finishedAt: new Date(), error: message });

  console.error(`\n[publish] FAILED: ${message}\n--- build output (last lines) ---\n${state.log.slice(-4000)}\n---------------------------------`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* Windows may briefly lock files (antivirus, indexer, an open preview) */
async function withRetry(action, attempts = 5) {
  for (let i = 1; ; i += 1) {
    try {
      return action();
    } catch (error) {
      if (i >= attempts || !['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY'].includes(error.code)) {
        throw error;
      }

      await sleep(400 * i);
    }
  }
}

async function swapBuild() {
  const dist = path.join(CLIENT_DIR, 'dist');
  const next = path.join(CLIENT_DIR, 'dist-next');
  const prev = path.join(CLIENT_DIR, 'dist-prev');

  if (!fs.existsSync(path.join(next, 'index.html'))) {
    throw new Error('Build output (dist-next/index.html) not found.');
  }

  await withRetry(() => fs.rmSync(prev, { recursive: true, force: true }));

  try {
    if (fs.existsSync(dist)) {
      await withRetry(() => fs.renameSync(dist, prev));
    }

    await withRetry(() => fs.renameSync(next, dist));
  } catch (error) {
    // Fallback when the folder itself cannot be renamed: replace its contents
    console.warn(`[publish] rename failed (${error.code}), copying files instead`);
    fs.mkdirSync(dist, { recursive: true });
    await withRetry(() => fs.cpSync(next, dist, { recursive: true, force: true }));
    await withRetry(() => fs.rmSync(next, { recursive: true, force: true }));
  }
}

export function startPublish() {
  if (state.status === 'running') {
    return false;
  }

  if (!fs.existsSync(path.join(CLIENT_DIR, 'package.json'))) {
    fail(`Site project not found at ${CLIENT_DIR} (set CLIENT_DIR in server/.env).`);
    return true;
  }

  const port = process.env.PORT || 5000;

  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !SECRET_KEYS.test(key))
  );

  Object.assign(env, {
    NODE_ENV: 'production',
    BUILD_OUT_DIR: 'dist-next',
    CONTENT_API_URL: `http://127.0.0.1:${port}/api/content`,
  });

  Object.assign(state, {
    status: 'running',
    startedAt: new Date(),
    finishedAt: null,
    error: '',
    log: '',
  });

  console.log(`[publish] building site in ${CLIENT_DIR} …`);

  const isWindows = process.platform === 'win32';

  let child;

  try {
    child = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'build'], {
      cwd: CLIENT_DIR,
      env,
      // .cmd files can only be started through a shell on Windows
      shell: isWindows,
      windowsHide: true,
    });
  } catch (error) {
    fail(`Could not start npm: ${error.message}`);
    return true;
  }

  child.stdout.on('data', appendLog);
  child.stderr.on('data', appendLog);

  child.on('error', (error) => fail(`Could not start npm: ${error.message}`));

  child.on('close', async (code) => {
    if (state.status !== 'running') {
      return;
    }

    if (code !== 0) {
      fail(`Build exited with code ${code}`);
      return;
    }

    try {
      await swapBuild();

      const settings = await getSiteSettings();
      settings.publishedAt = new Date();
      await settings.save();

      Object.assign(state, { status: 'success', finishedAt: new Date() });
      console.log('[publish] site updated.');
    } catch (error) {
      fail(error.message);
    }
  });

  return true;
}
