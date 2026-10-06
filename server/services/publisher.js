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
  see a half-built site. One build runs at a time.
*/

const serverRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLIENT_DIR = path.resolve(process.env.CLIENT_DIR || path.join(serverRoot, '..', 'client'));

// Only what npm/node need – server secrets are not passed to the build
const ENV_KEYS = ['PATH', 'Path', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'SystemRoot', 'ComSpec', 'TEMP', 'TMP', 'TMPDIR', 'npm_config_cache'];

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
  state.log = (state.log + chunk.toString()).slice(-6000);
}

function swapBuild() {
  const dist = path.join(CLIENT_DIR, 'dist');
  const next = path.join(CLIENT_DIR, 'dist-next');
  const prev = path.join(CLIENT_DIR, 'dist-prev');

  if (!fs.existsSync(path.join(next, 'index.html'))) {
    throw new Error('Build output not found.');
  }

  fs.rmSync(prev, { recursive: true, force: true });

  if (fs.existsSync(dist)) {
    fs.renameSync(dist, prev);
  }

  fs.renameSync(next, dist);
}

export function startPublish() {
  if (state.status === 'running') {
    return false;
  }

  const port = process.env.PORT || 5000;

  const env = Object.fromEntries(
    ENV_KEYS.filter((key) => process.env[key]).map((key) => [key, process.env[key]])
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

  const isWindows = process.platform === 'win32';

  const child = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'build'], {
    cwd: CLIENT_DIR,
    env,
    shell: isWindows,
  });

  child.stdout.on('data', appendLog);
  child.stderr.on('data', appendLog);

  child.on('error', (error) => {
    Object.assign(state, { status: 'failed', finishedAt: new Date(), error: error.message });
  });

  child.on('close', async (code) => {
    if (code !== 0) {
      Object.assign(state, { status: 'failed', finishedAt: new Date(), error: `Build exited with code ${code}` });
      return;
    }

    try {
      swapBuild();

      const settings = await getSiteSettings();
      settings.publishedAt = new Date();
      await settings.save();

      Object.assign(state, { status: 'success', finishedAt: new Date() });
    } catch (error) {
      Object.assign(state, { status: 'failed', finishedAt: new Date(), error: error.message });
    }
  });

  return true;
}
