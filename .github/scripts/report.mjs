/*
  Reports a publish stage to the API: POST <API_URL>/api/publish/callback
    node .github/scripts/report.mjs <stage> [message]
  Stages: build_started, build_succeeded, build_failed, deploy_started,
          deploy_succeeded, deploy_failed
  The admin panel also checks the GitHub run itself, so a report that cannot
  be delivered only delays the panel – it never fails the workflow.
*/
import fs from 'node:fs';

const [stage, message = ''] = process.argv.slice(2);
const api = (process.env.API_URL || '').replace(/\/$/, '');
const token = process.env.PUBLISH_CALLBACK_TOKEN || '';

if (!api || !token) {
  console.log(`[report] ${stage}: API_URL or PUBLISH_CALLBACK_TOKEN not set, skipped.`);
  process.exit(0);
}

const runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

// Last lines of the build log for failures (secrets are masked by GitHub and by the API)
let log = '';
if (/_failed$/.test(stage) && fs.existsSync('build.log')) {
  log = fs.readFileSync('build.log', 'utf8').split('\n').slice(-80).join('\n');
}

const body = {
  publishId: process.env.PUBLISH_ID || `run-${process.env.GITHUB_RUN_ID}`,
  stage,
  message,
  log,
  runId: process.env.GITHUB_RUN_ID,
  runUrl,
  commit: process.env.GITHUB_SHA,
  trigger: process.env.GITHUB_EVENT_NAME === 'push' ? 'push' : 'manual',
};

for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    const response = await fetch(`${api}/api/publish/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      console.log(`[report] ${stage}: delivered.`);
      process.exit(0);
    }

    console.log(`[report] ${stage}: API answered ${response.status}.`);
    if (response.status < 500) process.exit(0);
  } catch (error) {
    console.log(`[report] ${stage}: ${error.message}`);
  }

  await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
}

console.log(`[report] ${stage}: not delivered; the panel will read the run status from GitHub.`);
