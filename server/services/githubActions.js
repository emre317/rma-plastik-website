/*
  Minimal GitHub REST client for the publish workflow. The token stays on the
  server (PUBLISH_GITHUB_TOKEN, a fine-grained token limited to this repository with
  "Actions: read and write"); the browser never sees it.

    PUBLISH_GITHUB_REPOSITORY   owner/repo, e.g. emre317/rma-plastik-website
    PUBLISH_GITHUB_WORKFLOW     workflow file, default publish-site.yml
    PUBLISH_GITHUB_REF          branch the workflow runs on, default main
    PUBLISH_GITHUB_API_URL      default https://api.github.com (tests point it elsewhere)
*/

const TIMEOUT_MS = 15000;

export function githubConfig() {
  return {
    api: (process.env.PUBLISH_GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, ''),
    repo: process.env.PUBLISH_GITHUB_REPOSITORY || '',
    workflow: process.env.PUBLISH_GITHUB_WORKFLOW || 'publish-site.yml',
    ref: process.env.PUBLISH_GITHUB_REF || 'main',
    token: process.env.PUBLISH_GITHUB_TOKEN || '',
  };
}

export function isGithubConfigured() {
  const { repo, token } = githubConfig();
  return /^[\w.-]+\/[\w.-]+$/.test(repo) && Boolean(token);
}

async function call(path, { method = 'GET', body } = {}) {
  const { api, token } = githubConfig();

  let response;

  try {
    response = await fetch(`${api}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'rma-plastik-publisher',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(`GitHub'a ulaşılamadı (${error.name === 'TimeoutError' ? 'zaman aşımı' : error.message}).`);
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // GitHub's own message, never the token or headers
    const reason = data?.message ? String(data.message).slice(0, 200) : `HTTP ${response.status}`;
    const hint = response.status === 401 || response.status === 403
      ? ' (PUBLISH_GITHUB_TOKEN geçersiz ya da Actions yazma izni yok)'
      : response.status === 404
        ? ' (depo, workflow dosyası ya da dal bulunamadı)'
        : '';
    throw new Error(`GitHub isteği başarısız: ${reason}${hint}`);
  }

  return data;
}

/* Starts the publish workflow for one publish job */
export async function dispatchPublish(publishId) {
  const { repo, workflow, ref } = githubConfig();
  await call(`/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, {
    method: 'POST',
    body: { ref, inputs: { publish_id: publishId } },
  });
}

/* The run started for a publish job: its run-name contains the publish id */
export async function findPublishRun(publishId, since) {
  const { repo, workflow } = githubConfig();
  const created = since ? `&created=>=${new Date(since.getTime() - 60000).toISOString()}` : '';
  const data = await call(`/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?event=workflow_dispatch&per_page=20${created}`);
  const run = (data?.workflow_runs || []).find((item) => String(item.display_title || item.name || '').includes(publishId));
  return run ? summary(run) : null;
}

export async function getRun(runId) {
  const { repo } = githubConfig();
  return summary(await call(`/repos/${repo}/actions/runs/${encodeURIComponent(runId)}`));
}

function summary(run) {
  if (!run || run.id == null) throw new Error('GitHub yanıtında çalışma bilgisi yok.');
  return {
    id: String(run.id),
    url: run.html_url || '',
    status: run.status, // queued | in_progress | completed
    conclusion: run.conclusion, // success | failure | cancelled | timed_out | null
    commit: run.head_sha || '',
  };
}
