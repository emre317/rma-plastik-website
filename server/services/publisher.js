import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import PublishJob, { ACTIVE_STATUSES } from '../models/PublishJob.js';
import SiteSettings, { getSiteSettings } from '../models/SiteSettings.js';
import { publishMode } from '../config/env.js';
import { dispatchPublish, findPublishRun, getRun, isGithubConfigured } from './githubActions.js';

/*
  "Yayınla" rebuilds the public site with the content saved in the database.

  PUBLISH_MODE=github (production, shared hosting – nothing is built on the server):
    1. a publish job is saved and the publish lock taken (one build at a time)
    2. the "publish-site.yml" GitHub Actions workflow is started for the job
    3. the workflow reads /api/content (with CONTENT_API_TOKEN), builds and
       prerenders the site, deploys it to the hosting, and reports each stage
       back to /api/publish/callback (with PUBLISH_CALLBACK_TOKEN)
    4. the panel also checks the GitHub run itself, so a lost report or a
       cancelled run does not leave the job hanging

  PUBLISH_MODE=local (development or an own server with the site next to the API):
    `npm run build` in CLIENT_DIR into dist-next, then dist -> dist-prev, dist-next -> dist.

  In both modes the live site stays as it is until the new build is complete,
  and `publishedAt` only moves when the deployment really finished.
*/

const serverRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLIENT_DIR = path.resolve(process.env.CLIENT_DIR || path.join(serverRoot, '..', 'client'));

// Server secrets are not needed by the site build, so they are not passed on
const SECRET_KEYS = /^(MONGODB_|JWT_SECRET|SMTP_|MAIL_|QUOTE_NOTIFY_TO|ADMIN_|GITHUB_TOKEN|PUBLISH_CALLBACK_TOKEN)/i;

const TIMEOUT_MIN = Number(process.env.PUBLISH_TIMEOUT_MIN) || 40;
const POLL_EVERY_MS = 15000;
const LOG_MAX = 8000;

export const PUBLISH_STAGES = {
  dispatched: 'GitHub Actions başlatıldı',
  snapshot: 'İçerik alındı',
  build_started: 'Site derleniyor',
  build_succeeded: 'Derleme tamamlandı, sunucuya yükleniyor',
  build_failed: 'Derleme başarısız',
  deploy_started: 'Sunucuya yükleniyor',
  deploy_succeeded: 'Site yayında',
  deploy_failed: 'Yükleme başarısız; eski site yayında',
};

const newId = () => `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(5).toString('hex')}`;

// Never keep tokens in logs shown in the panel
export function sanitizeLog(text = '') {
  return String(text)
    .replace(/(authorization:\s*bearer\s+)\S+/gi, '$1***')
    .replace(/\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '***')
    .replace(/(mongodb(\+srv)?:\/\/)[^@\s]+@/gi, '$1***@')
    .replace(/((?:token|secret|password|pass)\s*[=:]\s*)\S+/gi, '$1***')
    .slice(-LOG_MAX);
}

/* ---------- Lock: only one publish at a time (atomic, survives restarts) ---------- */

async function takeLock(publishId) {
  await getSiteSettings();
  const stale = new Date(Date.now() - TIMEOUT_MIN * 60000);

  const settings = await SiteSettings.findOneAndUpdate(
    { singleton: 'site', $or: [{ publishLock: '' }, { publishLock: null }, { publishLockAt: { $lt: stale } }] },
    { $set: { publishLock: publishId, publishLockAt: new Date() } },
    { returnDocument: 'after' }
  );

  return Boolean(settings);
}

async function releaseLock(publishId) {
  await SiteSettings.updateOne({ singleton: 'site', publishLock: publishId }, { $set: { publishLock: '', publishLockAt: null } });
}

/* ---------- Job updates ---------- */

function addEvent(job, stage, message) {
  job.events.push({ at: new Date(), stage, message: (message || PUBLISH_STAGES[stage] || stage).slice(0, 300) });
  if (job.events.length > 30) job.events = job.events.slice(-30);
}

async function finish(job, { success, error = '', failedStep = null }) {
  job.status = success ? 'success' : 'failed';
  job.finishedAt = new Date();
  if (error) job.error = error.slice(0, 500);
  if (failedStep && job[failedStep].status !== 'success') job[failedStep] = { status: 'failed', at: new Date() };
  await job.save();

  if (success) {
    // Content saved after the snapshot is not part of this release, so it stays "pending"
    const settings = await getSiteSettings();
    settings.publishedAt = job.snapshotAt || job.startedAt || job.requestedAt;
    await settings.save();
  }

  await releaseLock(job.publishId);
  return job;
}

/* Applies one stage reported by the workflow (or by the local build) */
export async function applyStage(job, stage, { message = '', log = '', runId = '', runUrl = '', commit = '' } = {}) {
  if (runId) job.runId = String(runId).slice(0, 40);
  if (runUrl && /^https:\/\//.test(runUrl)) job.runUrl = runUrl.slice(0, 300);
  if (commit) job.commit = String(commit).slice(0, 60);
  if (log) job.log = sanitizeLog(log);

  // A finished job does not change any more (late or repeated reports)
  if (!ACTIVE_STATUSES.includes(job.status)) return job;

  addEvent(job, stage, message);

  switch (stage) {
    case 'build_started':
      job.status = 'building';
      job.startedAt ||= new Date();
      job.build = { status: 'running', at: new Date() };
      break;
    case 'build_succeeded':
      job.status = 'deploying';
      job.build = { status: 'success', at: new Date() };
      job.deploy = { status: 'running', at: new Date() };
      break;
    case 'deploy_started':
      job.status = 'deploying';
      job.deploy = { status: 'running', at: new Date() };
      break;
    case 'build_failed':
      job.deploy = { status: 'skipped', at: new Date() };
      return finish(job, { success: false, error: message || PUBLISH_STAGES.build_failed, failedStep: 'build' });
    case 'deploy_failed':
      return finish(job, { success: false, error: message || PUBLISH_STAGES.deploy_failed, failedStep: 'deploy' });
    case 'deploy_succeeded':
      job.build = job.build.status === 'success' ? job.build : { status: 'success', at: new Date() };
      job.deploy = { status: 'success', at: new Date() };
      return finish(job, { success: true });
    default:
      break;
  }

  await job.save();
  return job;
}

/* ---------- GitHub mode ---------- */

async function startGithub(job) {
  if (!isGithubConfigured()) {
    await finish(job, { success: false, error: 'GitHub bağlantısı yapılandırılmamış (GITHUB_TOKEN, GITHUB_REPOSITORY).', failedStep: 'build' });
    return;
  }

  try {
    await dispatchPublish(job.publishId);
    addEvent(job, 'dispatched');
    await job.save();
  } catch (error) {
    await finish(job, { success: false, error: error.message, failedStep: 'build' });
  }
}

/* Checks the GitHub run of an active job (at most every 15 s) */
export async function refreshJob(job) {
  if (!job || !ACTIVE_STATUSES.includes(job.status)) return job;

  const age = Date.now() - new Date(job.requestedAt).getTime();

  if (age > TIMEOUT_MIN * 60000) {
    await finish(job, { success: false, error: `Yayınlama ${TIMEOUT_MIN} dakika içinde tamamlanmadı (zaman aşımı).`, failedStep: job.build.status === 'success' ? 'deploy' : 'build' });
    return job;
  }

  if (job.mode !== 'github' || !isGithubConfigured()) return job;
  if (job.lastPolledAt && Date.now() - new Date(job.lastPolledAt).getTime() < POLL_EVERY_MS) return job;

  job.lastPolledAt = new Date();

  try {
    const run = job.runId ? await getRun(job.runId) : await findPublishRun(job.publishId, job.requestedAt);

    if (!run) {
      await job.save();
      return job;
    }

    // Never replace what the workflow already reported with an empty value
    if (run.id && run.id !== 'undefined') job.runId = run.id;
    if (run.url) job.runUrl = run.url;
    job.commit ||= run.commit;

    if (run.status === 'completed') {
      if (run.conclusion === 'success') {
        // The last workflow step reports the deployment; its success means the site is live
        return applyStage(job, 'deploy_succeeded', { message: 'GitHub Actions çalışması başarıyla tamamlandı.' });
      }

      const reason = { cancelled: 'iptal edildi', timed_out: 'zaman aşımına uğradı', failure: 'başarısız oldu' }[run.conclusion] || run.conclusion;
      return finish(job, {
        success: false,
        error: job.error || `GitHub Actions çalışması ${reason}.`,
        failedStep: job.build.status === 'success' ? 'deploy' : 'build',
      });
    }

    if (run.status === 'in_progress' && job.status === 'queued') {
      job.status = 'building';
      job.startedAt ||= new Date();
      job.build = { status: 'running', at: new Date() };
    }
  } catch (error) {
    // GitHub not reachable right now: try again on the next check
    console.warn('[publish] GitHub status check failed:', error.message);
  }

  await job.save();
  return job;
}

/* ---------- Local mode (development / own server) ---------- */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* Windows may briefly lock files (antivirus, indexer, an open preview) */
async function withRetry(action, attempts = 5) {
  for (let i = 1; ; i += 1) {
    try {
      return action();
    } catch (error) {
      if (i >= attempts || !['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY'].includes(error.code)) throw error;
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
    if (fs.existsSync(dist)) await withRetry(() => fs.renameSync(dist, prev));
    await withRetry(() => fs.renameSync(next, dist));
  } catch (error) {
    // Fallback when the folder itself cannot be renamed: replace its contents
    console.warn(`[publish] rename failed (${error.code}), copying files instead`);
    fs.mkdirSync(dist, { recursive: true });
    await withRetry(() => fs.cpSync(next, dist, { recursive: true, force: true }));
    await withRetry(() => fs.rmSync(next, { recursive: true, force: true }));
  }
}

function startLocal(job) {
  if (!fs.existsSync(path.join(CLIENT_DIR, 'package.json'))) {
    return finish(job, { success: false, error: `Site projesi bulunamadı: ${CLIENT_DIR} (server/.env içinde CLIENT_DIR).`, failedStep: 'build' });
  }

  const port = process.env.PORT || 5000;
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !SECRET_KEYS.test(key)));

  Object.assign(env, {
    NODE_ENV: 'production',
    BUILD_OUT_DIR: 'dist-next',
    CONTENT_API_URL: `http://127.0.0.1:${port}/api/content?publishId=${encodeURIComponent(job.publishId)}`,
    CONTENT_API_TOKEN: process.env.CONTENT_API_TOKEN || '',
    PUBLISH_ID: job.publishId,
  });

  let log = '';
  let saveTimer = null;
  const flush = () => {
    saveTimer = null;
    PublishJob.updateOne({ _id: job._id }, { $set: { log: sanitizeLog(log) } }).catch(() => {});
  };
  const append = (chunk) => {
    log = (log + chunk.toString()).slice(-LOG_MAX);
    saveTimer ||= setTimeout(flush, 2000);
  };

  const isWindows = process.platform === 'win32';
  let child;

  try {
    // Windows: npm is a .cmd file that must run through a shell (fixed command string)
    child = isWindows
      ? spawn('npm run build', { cwd: CLIENT_DIR, env, shell: true, windowsHide: true })
      : spawn('npm', ['run', 'build'], { cwd: CLIENT_DIR, env });
  } catch (error) {
    return finish(job, { success: false, error: `npm başlatılamadı: ${error.message}`, failedStep: 'build' });
  }

  applyStage(job, 'build_started').catch(() => {});
  console.log(`[publish] building site in ${CLIENT_DIR} …`);

  child.stdout.on('data', append);
  child.stderr.on('data', append);
  child.on('error', (error) => finish(job, { success: false, error: `npm başlatılamadı: ${error.message}`, failedStep: 'build' }).catch(() => {}));

  child.on('close', async (code) => {
    clearTimeout(saveTimer);
    const fresh = await PublishJob.findById(job._id);
    if (!fresh) return;

    if (code !== 0) {
      await applyStage(fresh, 'build_failed', { message: `Derleme hata kodu ${code} ile bitti.`, log });
      console.error(`[publish] FAILED (exit ${code})\n${sanitizeLog(log).slice(-3000)}`);
      return;
    }

    await applyStage(fresh, 'build_succeeded', { log });

    try {
      await swapBuild();
      await applyStage(fresh, 'deploy_succeeded');
      console.log('[publish] site updated.');
    } catch (error) {
      await applyStage(fresh, 'deploy_failed', { message: error.message });
    }
  });

  return null;
}

/* ---------- Public API ---------- */

/*
  Starts a publish. Returns { job } or { busy: true } when one is already running.
  `user` is the admin who pressed the button.
*/
export async function startPublish(user) {
  const mode = publishMode();

  if (mode === 'off') {
    const error = new Error('Yayınlama bu sunucuda kapalı (PUBLISH_MODE=off).');
    error.status = 400;
    throw error;
  }

  const publishId = newId();

  if (!(await takeLock(publishId))) {
    return { busy: true };
  }

  const settings = await getSiteSettings();

  const job = await PublishJob.create({
    publishId,
    mode,
    trigger: 'admin',
    requestedBy: { id: String(user?._id || user?.id || ''), name: user?.name || '', email: user?.email || '' },
    requestedAt: new Date(),
    events: [{ at: new Date(), stage: 'queued', message: `Yayınlama istendi (${settings.contentChangedAt ? 'son değişiklik ' + settings.contentChangedAt.toISOString() : 'değişiklik yok'}).` }],
  });

  if (mode === 'github') await startGithub(job);
  else await startLocal(job);

  return { job: await PublishJob.findById(job._id) };
}

/* Latest job (refreshed from GitHub while active) and the last few for the panel */
export async function getPublishState() {
  const [settings, recent] = await Promise.all([
    getSiteSettings(),
    PublishJob.find().sort({ requestedAt: -1 }).limit(6),
  ]);

  let latest = recent[0] || null;
  if (latest && ACTIVE_STATUSES.includes(latest.status)) latest = await refreshJob(latest);

  const view = (job) => job && ({
    publishId: job.publishId,
    mode: job.mode,
    trigger: job.trigger,
    status: job.status,
    requestedBy: job.requestedBy?.name || '',
    requestedAt: job.requestedAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    build: job.build?.status || 'pending',
    deploy: job.deploy?.status || 'pending',
    runUrl: job.runUrl,
    commit: job.commit,
    error: job.error,
    log: job.log,
    events: (job.events || []).map(({ at, stage, message }) => ({ at, stage, message })),
  });

  return {
    mode: publishMode(),
    // Kept for the panel: idle | running | success | failed
    status: !latest ? 'idle' : ACTIVE_STATUSES.includes(latest.status) ? 'running' : latest.status,
    job: view(latest),
    history: recent.slice(1).map((job) => ({
      publishId: job.publishId,
      status: job.status,
      requestedBy: job.requestedBy?.name || '',
      requestedAt: job.requestedAt,
      finishedAt: job.finishedAt,
      runUrl: job.runUrl,
      error: job.error,
    })),
    contentChangedAt: settings.contentChangedAt,
    publishedAt: settings.publishedAt,
  };
}

/* The build read the content snapshot for this job */
export async function markSnapshot(publishId) {
  if (!publishId) return;
  const job = await PublishJob.findOne({ publishId, status: { $in: ACTIVE_STATUSES } });
  if (!job || job.snapshotAt) return;
  job.snapshotAt = new Date();
  addEvent(job, 'snapshot');
  await job.save();
}

/*
  A stage report from the workflow. Reports without a known publish id come
  from a deployment started by a push or by hand: a job is recorded for them
  so the panel shows them too.
*/
export async function reportStage({ publishId, stage, ...details }) {
  if (!Object.hasOwn(PUBLISH_STAGES, stage)) {
    const error = new Error('Unknown stage.');
    error.status = 400;
    throw error;
  }

  let job = publishId ? await PublishJob.findOne({ publishId }) : null;

  if (!job) {
    if (stage !== 'build_started') {
      const error = new Error('Unknown publish job.');
      error.status = 404;
      throw error;
    }

    const id = publishId || `run-${String(details.runId || Date.now()).slice(0, 30)}`;
    job = await PublishJob.findOne({ publishId: id }) || await PublishJob.create({
      publishId: id,
      mode: 'github',
      trigger: details.trigger === 'push' ? 'push' : 'manual',
      requestedBy: { name: details.trigger === 'push' ? 'GitHub (kod gönderimi)' : 'GitHub (elle)' },
      requestedAt: new Date(),
      snapshotAt: new Date(),
    });
  }

  return applyStage(job, stage, details);
}

/*
  After a restart: a local build cannot be continued; GitHub jobs keep being
  followed (or time out).
*/
export async function recoverPublishJobs() {
  const active = await PublishJob.find({ status: { $in: ACTIVE_STATUSES } });

  for (const job of active) {
    if (job.mode === 'local') {
      await finish(job, { success: false, error: 'Sunucu yeniden başladığı için yerel derleme yarıda kaldı.', failedStep: job.build.status === 'success' ? 'deploy' : 'build' });
    } else {
      await refreshJob(job);
    }
  }
}
