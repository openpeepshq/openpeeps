/**
 * Offline API latency harness against a running OpenPeeps API.
 *
 * Examples:
 *   PERF_BASE_URL=http://localhost:5173 pnpm --filter @openpeepshq/tests run perf:api
 *   PERF_BACKUP_ZIP=/path/to/live.zip PERF_RESTORE=1 pnpm --filter @openpeepshq/tests run perf:api
 *
 * Writes JSON to platform/tests/.perf-results/
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testsRoot = join(__dirname, '..');
const resultsDir = join(testsRoot, '.perf-results');
const thresholdsPath = join(testsRoot, 'perf/thresholds.json');

const envInt = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`${name} must be a number, got ${JSON.stringify(raw)}`);
  }
  return n;
};

const cfg = {
  baseUrl: (
    process.env.PERF_BASE_URL ||
    process.env.LOADTEST_BASE_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    'http://localhost:5173'
  ).replace(/\/$/, ''),
  iterations: envInt('PERF_ITERATIONS', 8),
  warmup: envInt('PERF_WARMUP', 2),
  enforce:
    process.env.PERF_ENFORCE === '1' ||
    process.env.PERF_ENFORCE === 'true' ||
    !process.env.PERF_BACKUP_ZIP,
  restore:
    process.env.PERF_RESTORE === '1' || process.env.PERF_RESTORE === 'true',
  backupZip:
    process.env.PERF_BACKUP_ZIP ||
    join(testsRoot, 'fixtures/backups/default-install.zip'),
  email: process.env.PERF_EMAIL || '',
  password: process.env.PERF_PASSWORD || '',
  token: process.env.PERF_TOKEN || '',
};

const percentile = (sorted, p) => {
  if (!sorted.length) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
};

const summarize = (samples) => {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    mean: sorted.length ? sum / sorted.length : 0,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1] ?? 0,
  };
};

const apiJson = async (method, path, { token, body } = {}) => {
  const started = performance.now();
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const durationMs = performance.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(
      `${method} ${path} -> ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`,
    );
  }
  return { durationMs, data, status: res.status };
};

const login = async () => {
  if (cfg.token) return cfg.token;
  if (!cfg.email || !cfg.password) {
    throw new Error(
      'Set PERF_TOKEN or PERF_EMAIL + PERF_PASSWORD for authenticated scenarios',
    );
  }
  const { data } = await apiJson('POST', '/api/openpeeps/core/v1/auth/login', {
    body: { email: cfg.email, password: cfg.password },
  });
  if (!data?.token) {
    throw new Error('Login succeeded but no token in response');
  }
  return data.token;
};

const maybeRestore = () => {
  if (!cfg.restore) return;
  console.log(`Restoring backup ${cfg.backupZip} ...`);
  const result = spawnSync(
    process.execPath,
    [join(__dirname, 'restore-fixture.mjs'), cfg.backupZip],
    { stdio: 'inherit', env: process.env },
  );
  if (result.status !== 0) {
    throw new Error(`Backup restore failed with exit ${result.status}`);
  }
};

const runTimed = async (name, fn) => {
  const samples = [];
  for (let i = 0; i < cfg.warmup; i++) {
    await fn();
  }
  for (let i = 0; i < cfg.iterations; i++) {
    const { durationMs } = await fn();
    samples.push(durationMs);
  }
  return { name, ...summarize(samples) };
};

const main = async () => {
  maybeRestore();

  console.log(`Waiting for ${cfg.baseUrl}/health ...`);
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${cfg.baseUrl}/health`);
      if (res.ok) break;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
    if (i === 59) throw new Error('API health check timed out');
  }

  const token = await login();
  const me = (
    await apiJson('GET', '/api/openpeeps/core/v1/profiles/current', { token })
  ).data;

  const memberships = me?.memberships ?? [];
  const groupId = memberships[0]?.group?.id ?? memberships[0]?.groupId;

  const scenarios = [];

  scenarios.push(
    await runTimed('localFeed', () =>
      apiJson('GET', '/api/openpeeps/core/v1/posts/feeds/local?limit=20', {
        token,
      }),
    ),
  );
  scenarios.push(
    await runTimed('myFeed', () =>
      apiJson('GET', '/api/openpeeps/core/v1/posts/feeds/my?limit=20', {
        token,
      }),
    ),
  );

  if (groupId) {
    const page1 = await apiJson(
      'GET',
      `/api/openpeeps/core/v1/posts/by-group/${groupId}?limit=20`,
      { token },
    );
    scenarios.push(
      await runTimed('groupFeed', () =>
        apiJson(
          'GET',
          `/api/openpeeps/core/v1/posts/by-group/${groupId}?limit=20`,
          { token },
        ),
      ),
    );
    const lastId = Array.isArray(page1.data)
      ? page1.data[page1.data.length - 1]?.id
      : undefined;
    if (lastId) {
      scenarios.push(
        await runTimed('groupFeedPage2', () =>
          apiJson(
            'GET',
            `/api/openpeeps/core/v1/posts/by-group/${groupId}?limit=20&start=${encodeURIComponent(lastId)}`,
            { token },
          ),
        ),
      );
    }
  }

  scenarios.push(
    await runTimed('conversations', () =>
      apiJson('GET', '/api/openpeeps/core/v1/conversations', { token }),
    ),
  );
  scenarios.push(
    await runTimed('unseenCounts', () =>
      apiJson('GET', '/api/openpeeps/core/v1/posts/unseen/counts', { token }),
    ),
  );
  scenarios.push(
    await runTimed('searchProfiles', () =>
      apiJson(
        'GET',
        '/api/openpeeps/core/v1/search/profiles?q=a&limit=15',
        { token },
      ),
    ),
  );
  scenarios.push(
    await runTimed('searchPosts', () =>
      apiJson('GET', '/api/openpeeps/core/v1/search/posts?q=a&limit=15', {
        token,
      }),
    ),
  );

  const feedSample = (
    await apiJson('GET', '/api/openpeeps/core/v1/posts/feeds/local?limit=1', {
      token,
    })
  ).data;
  const postId = Array.isArray(feedSample) ? feedSample[0]?.id : undefined;
  if (postId) {
    scenarios.push(
      await runTimed('postDetail', () =>
        apiJson('GET', `/api/openpeeps/core/v1/posts/${postId}`, { token }),
      ),
    );
  }

  const thresholds = JSON.parse(await readFile(thresholdsPath, 'utf8'));
  const failures = [];
  for (const row of scenarios) {
    const ceiling = thresholds.endpoints?.[row.name];
    if (ceiling != null && row.p95 > ceiling) {
      failures.push({
        name: row.name,
        p95: row.p95,
        ceiling,
      });
    }
  }

  const report = {
    at: new Date().toISOString(),
    baseUrl: cfg.baseUrl,
    backupZip: cfg.backupZip,
    iterations: cfg.iterations,
    warmup: cfg.warmup,
    enforce: cfg.enforce,
    scenarios,
    failures,
  };

  await mkdir(resultsDir, { recursive: true });
  const outPath = join(
    resultsDir,
    `api-perf-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${outPath}`);

  if (cfg.enforce && failures.length) {
    console.error('Perf thresholds exceeded:', failures);
    process.exit(1);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
