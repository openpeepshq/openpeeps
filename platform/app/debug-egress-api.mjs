// #region agent log
import fs from 'node:fs';

const LOG_PATH = '/Users/doublemalt/Projects/allpeep/code/.cursor/debug-a0a46a.log';
const SESSION_ID = 'a0a46a';
const RUN_ID = process.env.DEBUG_RUN_ID || 'run1';

function logLine(hypothesisId, message, data) {
  const entry = {
    sessionId: SESSION_ID,
    runId: RUN_ID,
    hypothesisId,
    location: 'debug-egress-api.mjs',
    message,
    data,
    timestamp: Date.now(),
  };
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
  console.log(`[${hypothesisId}] ${message}`, JSON.stringify(data));
}

const OBSERVER_URL = process.env.OBSERVER_URL;
if (!OBSERVER_URL) {
  console.error('Set OBSERVER_URL');
  process.exit(1);
}

const u = new URL(OBSERVER_URL);
const jamId = u.pathname.match(/\/events\/([^/]+)\/jam/)?.[1];
const token = u.searchParams.get('token');
const base = `${u.protocol}//${u.host}`;

logLine('H-C', 'parsed observer url', {
  base,
  jamId,
  hasToken: !!token,
  observer: u.searchParams.get('observer'),
});

async function probe(hypothesisId, label, url, authToken) {
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  try {
    const res = await fetch(url, { headers, redirect: 'manual' });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    logLine(hypothesisId, label, {
      url: url.replace(/Bearer\s+\S+/, 'Bearer <redacted>'),
      status: res.status,
      bodySnippet: text.slice(0, 600),
      jsonKeys: json && typeof json === 'object' ? Object.keys(json) : null,
      hasLivekitToken: !!(json?.token),
      success: json?.success,
    });
    return { status: res.status, json, text };
  } catch (e) {
    logLine(hypothesisId, `${label} fetch error`, { error: String(e) });
    return { status: 0 };
  }
}

// H-B: post fetch with service token
await probe(
  'H-B',
  'GET post (service token)',
  `${base}/api/openpeeps/core/v1/posts/${jamId}`,
  token,
);

// H-A: jam LiveKit token with service token (egress path)
await probe(
  'H-A',
  'GET jam token (service token)',
  `${base}/api/openpeeps/core/v1/jams/${jamId}/token`,
  token,
);

// H-C: initial HTML page load
try {
  const res = await fetch(OBSERVER_URL, { redirect: 'manual' });
  const html = await res.text();
  logLine('H-C', 'GET observer page HTML', {
    status: res.status,
    htmlLength: html.length,
    hasSvelteKit: html.includes('__sveltekit') || html.includes('sveltekit'),
    titleMatch: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null,
    snippet: html.slice(0, 400),
  });
} catch (e) {
  logLine('H-C', 'observer page fetch error', { error: String(e) });
}

logLine('H-C', 'api probe complete', {});
// #endregion
