import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { memoryModel } from './helpers/memoryModels.js';

/* Fake GitHub API: records dispatches, serves workflow runs */
const github = { dispatches: [], runs: [], dispatchStatus: 204 };
const fake = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    assert.equal(req.headers.authorization, 'Bearer test-github-token');
    if (req.method === 'POST' && req.url.endsWith('/dispatches')) {
      github.dispatches.push(JSON.parse(body));
      res.writeHead(github.dispatchStatus, { 'Content-Type': 'application/json' });
      return res.end(github.dispatchStatus === 204 ? '' : JSON.stringify({ message: 'Resource not accessible by personal access token' }));
    }
    if (req.url.includes('/runs?')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ workflow_runs: github.runs }));
    }
    const match = req.url.match(/\/runs\/(\d+)$/);
    if (match) {
      const run = github.runs.find((item) => String(item.id) === match[1]);
      res.writeHead(run ? 200 : 404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(run || { message: 'Not Found' }));
    }
    res.writeHead(404); res.end('{}');
  });
});
await new Promise((resolve) => fake.listen(0, resolve));
test.after(() => fake.close());

Object.assign(process.env, {
  NODE_ENV: 'production',
  PUBLISH_MODE: 'github',
  PUBLISH_GITHUB_TOKEN: 'test-github-token',
  PUBLISH_GITHUB_REPOSITORY: 'emre317/rma-plastik-website',
  PUBLISH_GITHUB_API_URL: `http://127.0.0.1:${fake.address().port}`,
});

const { default: PublishJob } = await import('../models/PublishJob.js');
const { default: SiteSettings, getSiteSettings } = await import('../models/SiteSettings.js');
const jobs = memoryModel(PublishJob);
memoryModel(SiteSettings);

const publisher = await import('../services/publisher.js');
const user = { _id: 'u1', name: 'Emre', email: 'emre@rmaplastik.com' };
const lock = async () => (await getSiteSettings()).publishLock;

test('a publish starts the workflow and only one runs at a time', async () => {
  const { job } = await publisher.startPublish(user);
  assert.equal(job.status, 'queued');
  assert.equal(job.mode, 'github');
  assert.deepEqual(github.dispatches.at(-1), { ref: 'main', inputs: { publish_id: job.publishId } });
  assert.equal(await lock(), job.publishId);

  const second = await publisher.startPublish(user);
  assert.equal(second.busy, true);
  assert.equal(github.dispatches.length, 1);

  // The build reads the content, then reports its stages
  await publisher.markSnapshot(job.publishId);
  const snapshotAt = (await PublishJob.findOne({ publishId: job.publishId })).snapshotAt;
  assert.ok(snapshotAt);

  let current = await publisher.reportStage({ publishId: job.publishId, stage: 'build_started', runId: '101', runUrl: 'https://github.com/x/y/actions/runs/101' });
  assert.equal(current.status, 'building');
  current = await publisher.reportStage({ publishId: job.publishId, stage: 'build_succeeded' });
  assert.equal(current.status, 'deploying');
  assert.equal(current.build.status, 'success');
  assert.equal((await getSiteSettings()).publishedAt, null, 'not published before the deployment');

  current = await publisher.reportStage({ publishId: job.publishId, stage: 'deploy_succeeded' });
  assert.equal(current.status, 'success');
  assert.equal(current.deploy.status, 'success');
  assert.equal((await getSiteSettings()).publishedAt.getTime(), snapshotAt.getTime(), 'publishedAt = content snapshot time');
  assert.equal(await lock(), '', 'lock released');

  // A late or repeated report changes nothing
  current = await publisher.reportStage({ publishId: job.publishId, stage: 'deploy_failed' });
  assert.equal(current.status, 'success');

  const state = await publisher.getPublishState();
  assert.equal(state.status, 'success');
  assert.equal(state.job.runUrl, 'https://github.com/x/y/actions/runs/101');
});

test('a failed build keeps the old site and the old publish date', async () => {
  const before = (await getSiteSettings()).publishedAt;
  const { job } = await publisher.startPublish(user);
  await publisher.reportStage({ publishId: job.publishId, stage: 'build_started' });
  const current = await publisher.reportStage({
    publishId: job.publishId,
    stage: 'build_failed',
    message: 'Derleme başarısız.',
    log: 'error TS1005\nAuthorization: Bearer secret-value-123\nghp_' + 'z'.repeat(36),
  });
  assert.equal(current.status, 'failed');
  assert.equal(current.build.status, 'failed');
  assert.equal(current.deploy.status, 'skipped');
  assert.ok(!current.log.includes('secret-value-123') && !current.log.includes('ghp_'));
  assert.equal((await getSiteSettings()).publishedAt.getTime(), before.getTime());
  assert.equal(await lock(), '');
});

test('a failed deployment is told apart from a failed build', async () => {
  const { job } = await publisher.startPublish(user);
  await publisher.reportStage({ publishId: job.publishId, stage: 'build_started' });
  await publisher.reportStage({ publishId: job.publishId, stage: 'build_succeeded' });
  const current = await publisher.reportStage({ publishId: job.publishId, stage: 'deploy_failed', message: 'Sunucuya yükleme başarısız; eski site yayında.' });
  assert.equal(current.status, 'failed');
  assert.equal(current.build.status, 'success');
  assert.equal(current.deploy.status, 'failed');
});

test('without reports the panel follows the GitHub run', async () => {
  const { job } = await publisher.startPublish(user);
  github.runs = [{ id: 202, html_url: 'https://github.com/x/y/actions/runs/202', status: 'completed', conclusion: 'cancelled', head_sha: 'abc', display_title: `Yayınla ${job.publishId}` }];
  const state = await publisher.getPublishState();
  assert.equal(state.status, 'failed');
  assert.match(state.job.error, /iptal/);
  assert.equal(state.job.runUrl, 'https://github.com/x/y/actions/runs/202');
  assert.equal(await lock(), '');

  // A successful run counts as deployed (its last step reports the deployment)
  const next = await publisher.startPublish(user);
  github.runs = [{ id: 203, html_url: 'https://github.com/x/y/actions/runs/203', status: 'completed', conclusion: 'success', head_sha: 'abd', display_title: `Yayınla ${next.job.publishId}` }];
  assert.equal((await publisher.getPublishState()).status, 'success');
});

test('GitHub refusing the start is shown and frees the lock', async () => {
  github.dispatchStatus = 403;
  const { job } = await publisher.startPublish(user);
  github.dispatchStatus = 204;
  assert.equal(job.status, 'failed');
  assert.match(job.error, /PUBLISH_GITHUB_TOKEN/);
  assert.equal(await lock(), '');
});

test('deployments started by a push are recorded too', async () => {
  let current = await publisher.reportStage({ publishId: 'run-555', stage: 'build_started', runId: '555', trigger: 'push' });
  assert.equal(current.trigger, 'push');
  current = await publisher.reportStage({ publishId: 'run-555', stage: 'deploy_succeeded' });
  assert.equal(current.status, 'success');
  await assert.rejects(() => publisher.reportStage({ publishId: 'unknown', stage: 'deploy_succeeded' }), /Unknown publish job/);
  await assert.rejects(() => publisher.reportStage({ publishId: 'run-555', stage: 'rm -rf' }), /Unknown stage/);
});

test('stuck jobs time out and an interrupted local build is closed after a restart', async () => {
  const old = await PublishJob.create({ publishId: 'old-1', mode: 'github', requestedAt: new Date(Date.now() - 3 * 3600000) });
  await publisher.refreshJob(old);
  assert.equal(old.status, 'failed');
  assert.match(old.error, /zaman aşımı/);

  const local = await PublishJob.create({ publishId: 'local-1', mode: 'local', status: 'building' });
  await publisher.recoverPublishJobs();
  assert.equal(local.status, 'failed');
  assert.match(local.error, /yeniden başladı/);
  assert.ok(jobs.store.length >= 8);
});
