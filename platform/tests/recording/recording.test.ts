/**
 * Jam recording upload test.
 *
 * Registers N users, creates a jam, connects each user to the jam via
 * Playwright (browser), then performs N recording start/stop cycles of a
 * given duration. After a 5-minute settle period it verifies that every
 * recording was uploaded (status `completed` with an attachment).
 *
 * Participants publish a fake video track (via a Y4M file) so recordings
 * contain real video data and produce meaningful file sizes.
 *
 * Environment variables:
 *   RECORDING_TEST_USERS       – number of participant users (default 3)
 *   RECORDING_TEST_DURATION_SEC – seconds each recording runs (default 30)
 *   RECORDING_TEST_CYCLES      – number of start/stop cycles (default 3)
 *   PLAYWRIGHT_BASE_URL        – OpenPeeps web URL (default http://localhost:5173)
 *   RECORDING_TEST_PASSWORD    – shared password for test accounts (default "rec-test-pw")
 *   RECORDING_TEST_VIDEO_Y4M   – path to a Y4M file for fake video capture
 *
 * Requires LiveKit to be configured on the target instance.
 */
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { apiHeaders, getServerInfo } from '../helpers/api';

const envInt = (name: string, fallback: number) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(
      `${name} must be a non-negative number, got ${JSON.stringify(raw)}`,
    );
  }
  return n;
};

const cfg = {
  users: envInt('RECORDING_TEST_USERS', 3),
  durationSec: envInt('RECORDING_TEST_DURATION_SEC', 30),
  cycles: envInt('RECORDING_TEST_CYCLES', 3),
  password: process.env.RECORDING_TEST_PASSWORD ?? 'rec-test-pw',
};

const AUTH_STORAGE_KEY = 'auth_credentials';

const livekitEnabled = async (request: APIRequestContext) => {
  const info = await getServerInfo(request);
  return !!info.jams?.livekit?.enabled;
};

const registerOrLogin = async (
  request: APIRequestContext,
  handle: string,
  email: string,
) => {
  const body = {
    handle,
    displayName: handle,
    email,
    password: cfg.password,
    privacyPolicyAccepted: true,
  };
  const res = await request.post('/api/openpeeps/core/v1/auth/register', {
    data: body,
  });
  if (res.ok()) {
    return (await res.json()) as { token: string };
  }
  // 409 → already exists, try login
  const loginRes = await request.post('/api/openpeeps/core/v1/auth/login', {
    data: { email, password: cfg.password },
  });
  expect(
    loginRes.ok(),
    `login failed: ${loginRes.status()} ${await loginRes.text()}`,
  ).toBeTruthy();
  return (await loginRes.json()) as { token: string };
};

const createJam = async (
  request: APIRequestContext,
  token: string,
  moderatorId: string,
) => {
  const start = new Date(Date.now() + 60_000).toISOString();
  const end = new Date(Date.now() + 3_600_000).toISOString();
  const res = await request.post('/api/openpeeps/core/v1/posts', {
    headers: apiHeaders(token),
    data: {
      type: 'event',
      visibility: 'local',
      data: {
        type: 'event',
        name: `Recording test jam ${Date.now()}`,
        content: 'Recording upload test',
        start,
        end,
        wholeDay: false,
        jam: {
          type: 'video-call',
          videoEnabled: true,
          moderators: [moderatorId],
          waitingRoom: false,
        },
      },
    },
  });
  expect(
    res.ok(),
    `create jam failed: ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
  return (await res.json()) as { id: string };
};

const startRecording = async (
  request: APIRequestContext,
  token: string,
  jamId: string,
) => {
  const res = await request.post(
    `/api/openpeeps/core/v1/jams/${jamId}/recordings`,
    {
      headers: apiHeaders(token),
      data: {},
    },
  );
  expect(
    res.ok(),
    `start recording failed: ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
  return res.json() as Promise<{ id: string; status: string }>;
};

const stopRecording = async (
  request: APIRequestContext,
  token: string,
  jamId: string,
) => {
  const res = await request.put(
    `/api/openpeeps/core/v1/jams/${jamId}/recordings/stop`,
    { headers: apiHeaders(token), data: {} },
  );
  expect(
    res.ok(),
    `stop recording failed: ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
  return res.json() as Promise<{ id: string; status: string }>;
};

const listRecordings = async (
  request: APIRequestContext,
  token: string,
  postId: string,
) => {
  const res = await request.get(
    `/api/openpeeps/core/v1/posts/${postId}/recordings`,
    { headers: apiHeaders(token) },
  );
  expect(
    res.ok(),
    `list recordings failed: ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
  return res.json() as Promise<
    Array<{
      id: string;
      status: string;
      attachment?: { id: string; url: string };
    }>
  >;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Injects the auth token into localStorage and navigates the page to the
 * jam room URL. The web client reads `auth_credentials` from localStorage
 * on load (see platform/react/src/auth/credentials/index.ts).
 *
 * The browser is launched with `--use-fake-device-for-media-stream` and
 * `--use-file-for-fake-video-capture` Chrome flags (configured in
 * playwright.config.ts) so that participants publish a video track.
 */
const joinJamViaUi = async (
  page: Page,
  token: string,
  baseUrl: string,
  jamId: string,
) => {
  await page.addInitScript(
    ([key, authToken]) => {
      window.localStorage.setItem(key, JSON.stringify({ token: authToken }));
    },
    [AUTH_STORAGE_KEY, token],
  );

  await page.goto(`${baseUrl}/events/${jamId}/jam`, {
    waitUntil: 'domcontentloaded',
  });

  // Enable video before joining — the lobby defaults to camera-off.
  // The DeviceSelectorPill renders a JamToolbarButton with aria-label "Turn on camera".
  await page
    .getByRole('button', { name: 'Turn on camera' })
    .click({ timeout: 10_000 })
    .catch(() => undefined); // best-effort: video may already be on

  // The lobby shows a "Start" (or "Join") button — click it to enter the room.
  // The Button component sets aria-label from its title prop ("Join Jam").
  await page
    .getByRole('button', { name: 'Join Jam' })
    .click({ timeout: 15_000 });

  // Wait for the LiveKit room to connect (LiveKitRoom renders with data-lk-theme).
  await page.waitForSelector('[data-lk-theme]', { timeout: 30_000 });
  // Give LiveKit a moment to actually establish the connection after render.
  await sleep(3_000);
};

/**
 * Polls the jam state API until the jam is active (i.e. at least one
 * participant is connected to the LiveKit room), or times out.
 */
const waitForJamActive = async (
  request: APIRequestContext,
  token: string,
  jamId: string,
  timeoutMs = 60_000,
) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(
      `/api/openpeeps/core/v1/jams/${jamId}/state`,
      {
        headers: apiHeaders(token),
      },
    );
    if (res.ok()) {
      const state = await res.json();
      if (state.active) return;
    }
    await sleep(1_000);
  }
  throw new Error(`Jam ${jamId} did not become active within ${timeoutMs}ms`);
};

test.describe('Jam recording upload', () => {
  test('recordings are uploaded after multiple start/stop cycles', async ({
    request,
    browser,
  }) => {
    const baseUrl = (
      process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
    ).replace(/\/$/, '');

    // --- 1. Verify LiveKit is enabled on the instance ---
    const livekitOk = await livekitEnabled(request);
    expect(livekitOk, 'LiveKit jams are not enabled on this instance').toBe(
      true,
    );

    // --- 2. Register the moderator ---
    const modHandle = `recmod${Date.now().toString(36).slice(-6)}`;
    const modEmail = `${modHandle}@recording-test.local`;
    const modAuth = await registerOrLogin(request, modHandle, modEmail);
    const modProfile = await request
      .get('/api/openpeeps/core/v1/profiles/current', {
        headers: apiHeaders(modAuth.token),
      })
      .then((r) => r.json());

    // --- 3. Register participant users ---
    const users: Array<{ token: string; profileId: string; handle: string }> =
      [];
    for (let i = 0; i < cfg.users; i++) {
      const handle = `recu${i}${Date.now().toString(36).slice(-6)}`;
      const email = `${handle}@recording-test.local`;
      const auth = await registerOrLogin(request, handle, email);
      const profile = await request
        .get('/api/openpeeps/core/v1/profiles/current', {
          headers: apiHeaders(auth.token),
        })
        .then((r) => r.json());
      users.push({ token: auth.token, profileId: profile.id, handle });
    }

    // --- 4. Create a jam ---
    const jam = await createJam(request, modAuth.token, modProfile.id);
    const jamId = jam.id;
    console.log(`Created jam ${jamId} with ${cfg.users} participants`);

    // Get the observer URL so people can watch the jam without joining.
    const observerRes = await request.get(
      `/api/openpeeps/core/v1/jams/${jamId}/recordings/observer-link`,
      { headers: apiHeaders(modAuth.token) },
    );
    if (observerRes.ok()) {
      const observer = await observerRes.json();
      console.log(`Observer URL: ${baseUrl}${observer.path}`);
    } else {
      console.log(`Observer URL: unavailable (${observerRes.status()})`);
    }

    // --- 5. Connect the moderator to the jam via Playwright ---
    const modCtx = await browser.newContext();
    const modPage = await modCtx.newPage();
    await joinJamViaUi(modPage, modAuth.token, baseUrl, jamId);
    console.log('Moderator joined jam');

    // Wait for the jam to become active (moderator is now in the LiveKit room).
    await waitForJamActive(request, modAuth.token, jamId);

    // --- 6. Connect each participant via Playwright ---
    const participantPages: Page[] = [];
    for (const user of users) {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await joinJamViaUi(p, user.token, baseUrl, jamId);
      participantPages.push(p);
      console.log(`Participant ${user.handle} joined jam`);
    }

    // Give LiveKit a moment to stabilise with all participants connected.
    await sleep(5_000);

    // --- 7. Recording start/stop cycles ---
    for (let cycle = 1; cycle <= cfg.cycles; cycle++) {
      console.log(`Cycle ${cycle}/${cfg.cycles}: starting recording…`);
      const started = await startRecording(request, modAuth.token, jamId);
      console.log(`  Recording started: ${started.id} (${started.status})`);

      // Wait for the specified duration.
      await sleep(cfg.durationSec * 1000);

      console.log(`Cycle ${cycle}/${cfg.cycles}: stopping recording…`);
      const stopped = await stopRecording(request, modAuth.token, jamId);
      console.log(`  Recording stopped: ${stopped.id} (${stopped.status})`);

      // Brief pause between cycles so LiveKit can finalise the egress.
      await sleep(5_000);
    }

    // --- 8. Close participant browser contexts ---
    for (const p of participantPages) {
      await p.context().close();
    }
    await modCtx.close();

    // --- 9. Wait 5 minutes for uploads to complete ---
    console.log('Waiting 5 minutes for recording uploads to complete…');
    await sleep(5 * 60 * 1000);

    // --- 10. Verify recordings were uploaded ---
    const recordings = await listRecordings(request, modAuth.token, jamId);
    console.log(`Found ${recordings.length} recording(s)`);

    expect(recordings.length).toBe(cfg.cycles);
    for (const rec of recordings) {
      expect(rec.status, `recording ${rec.id} status is ${rec.status}`).toBe(
        'completed',
      );
      expect(
        rec.attachment,
        `recording ${rec.id} has no attachment (not uploaded)`,
      ).toBeDefined();
      expect(rec.attachment?.url).toBeTruthy();
    }

    console.log('All recordings verified as uploaded.');
  });
});
