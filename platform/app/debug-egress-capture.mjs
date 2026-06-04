// #region agent log
// Debug harness (session a0a46a): reproduces LiveKit Web Egress loading the jam
// recording/observer page in a headless browser, and captures runtime evidence
// (network responses, console errors, redirects, screenshot) as NDJSON.
//
// Usage:
//   OBSERVER_URL="https://<prod>/events/<jamId>/jam?observer=true&token=<egressToken>" \
//   node debug-egress-capture.mjs
//
// Requires @playwright/test (already a devDependency of platform/app).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const LOG_PATH = '/Users/doublemalt/Projects/allpeep/code/.cursor/debug-a0a46a.log';
const SESSION_ID = 'a0a46a';
const RUN_ID = process.env.DEBUG_RUN_ID || 'run1';

function logLine(hypothesisId, message, data) {
  const entry = {
    sessionId: SESSION_ID,
    runId: RUN_ID,
    hypothesisId,
    location: 'debug-egress-capture.mjs',
    message,
    data,
    timestamp: Date.now(),
  };
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error('failed to write log', e);
  }
  console.log(`[${hypothesisId}] ${message}`, JSON.stringify(data));
}

const OBSERVER_URL = process.env.OBSERVER_URL;
if (!OBSERVER_URL) {
  console.error('Set OBSERVER_URL env var to the prod observer/recording URL.');
  process.exit(1);
}

// Avoid logging the secret token value itself.
const safeUrl = OBSERVER_URL.replace(/token=[^&]+/i, 'token=<redacted>');
logLine('H-C', 'starting egress capture', { safeUrl });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

const interesting = (url) =>
  /\/jams\/[^/]+\/token/.test(url) ||
  /\/posts\//.test(url) ||
  /\/jams\//.test(url);

page.on('response', async (response) => {
  const url = response.url();
  if (!interesting(url)) return;
  const status = response.status();
  let bodySnippet;
  if (status >= 400) {
    try {
      const text = await response.text();
      bodySnippet = text.slice(0, 500);
    } catch {
      bodySnippet = '<unreadable>';
    }
  }
  let hyp = 'H-A';
  if (/\/posts\//.test(url)) hyp = 'H-B';
  if (/\/jams\/[^/]+\/token/.test(url)) hyp = 'H-A';
  logLine(hyp, 'api response', {
    url: url.replace(/token=[^&]+/i, 'token=<redacted>'),
    status,
    bodySnippet,
  });
});

page.on('requestfailed', (req) => {
  logLine('H-C', 'request failed', {
    url: req.url().replace(/token=[^&]+/i, 'token=<redacted>'),
    failure: req.failure()?.errorText,
  });
});

page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    logLine('H-D', 'browser console', { type: msg.type(), text: msg.text().slice(0, 400) });
  }
});

page.on('pageerror', (err) => {
  logLine('H-D', 'page error', { message: String(err).slice(0, 400) });
});

try {
  const resp = await page.goto(OBSERVER_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  logLine('H-C', 'initial navigation done', { status: resp?.status() ?? null });

  // Let the SPA fetch the post + token and attempt to connect.
  await page.waitForTimeout(12000);

  const finalUrl = page.url().replace(/token=[^&]+/i, 'token=<redacted>');
  const redirected = !finalUrl.includes('/jam');
  logLine('H-E', 'final url after settle', { finalUrl, redirectedAwayFromJam: redirected });

  const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
  logLine('H-D', 'visible body text snapshot', {
    length: bodyText.length,
    snippet: bodyText.slice(0, 300),
    hasVideoEl: await page.locator('video').count(),
  });

  const shotPath = path.join(process.cwd(), `debug-egress-${RUN_ID}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });
  logLine('H-C', 'screenshot saved', { shotPath });
} catch (e) {
  logLine('H-C', 'navigation/capture threw', { error: String(e).slice(0, 400) });
} finally {
  await browser.close();
  logLine('H-C', 'capture complete', {});
}
// #endregion
