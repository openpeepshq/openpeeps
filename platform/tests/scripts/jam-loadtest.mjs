/**
 * Jam load test: N LiveKit publishers for DURATION_SEC, plus in-jam
 * messages/reactions at EVENTS_PER_MIN with ≤ MAX_EVENT_LATENCY_MS delivery.
 *
 * Prerequisites: an OpenPeeps API root whose jam token endpoint can mint
 * LiveKit JWTs (server-side LiveKit config). No local JAMS_LIVEKIT_* needed.
 * Run: pnpm --filter @openpeepshq/tests run loadtest:jam
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  AudioFrame,
  AudioSource,
  LocalAudioTrack,
  Room,
  RoomEvent,
  TrackPublishOptions,
  TrackSource,
  TrackKind,
  ConnectionState,
  dispose,
} from '@livekit/rtc-node';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(__dirname, '../.loadtest-results');

const envInt = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`${name} must be a number, got ${JSON.stringify(raw)}`);
  }
  return n;
};

const envFloat = (name, fallback) => {
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
    process.env.LOADTEST_BASE_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    'http://localhost:5173'
  ).replace(/\/$/, ''),
  participants: envInt('LOADTEST_PARTICIPANTS', 100),
  durationSec: envInt('LOADTEST_DURATION_SEC', 300),
  eventsPerMin: envInt('LOADTEST_EVENTS_PER_MIN', 100),
  maxEventLatencyMs: envInt('LOADTEST_MAX_EVENT_LATENCY_MS', 1000),
  minEventDeliveryRate: envFloat('LOADTEST_MIN_EVENT_DELIVERY_RATE', 0.95),
  minConnectRate: envFloat('LOADTEST_MIN_CONNECT_RATE', 0.95),
  minPublishRate: envFloat('LOADTEST_MIN_PUBLISH_RATE', 0.95),
  minStayConnectedRate: envFloat('LOADTEST_MIN_STAY_CONNECTED_RATE', 0.95),
  connectRps: envFloat('LOADTEST_CONNECT_RPS', 8),
  registerConcurrency: envInt('LOADTEST_REGISTER_CONCURRENCY', 10),
  userPrefix: process.env.LOADTEST_USER_PREFIX || `lt${Date.now().toString(36)}`,
  password: process.env.LOADTEST_PASSWORD || 'loadtest-password-1',
  moderatorToken: process.env.LOADTEST_TOKEN || '',
  video: process.env.LOADTEST_VIDEO === 'true',
};

const apiHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'content-type': 'application/json',
});

const apiJson = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: token ? apiHeaders(token) : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    throw new Error(
      `${method} ${path} failed: ${res.status} ${text.slice(0, 500)}`,
    );
  }
  return json;
};

const uniqueSuffix = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const registerOrLogin = async (handle, email) => {
  try {
    return await apiJson('POST', '/api/openpeeps/core/v1/auth/register', {
      body: {
        handle,
        displayName: handle,
        email,
        password: cfg.password,
        privacyPolicyAccepted: true,
      },
    });
  } catch {
    return apiJson('POST', '/api/openpeeps/core/v1/auth/login', {
      body: { email, password: cfg.password },
    });
  }
};

const mapPool = async (items, concurrency, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (next < items.length) {
        const i = next;
        next += 1;
        results[i] = await fn(items[i], i);
      }
    },
  );
  await Promise.all(workers);
  return results;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const percentile = (sorted, p) => {
  if (sorted.length === 0) return null;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
};

const SAMPLE_RATE = 48_000;
const CHANNELS = 1;
const FRAME_SAMPLES = 960; // 20ms

const createSilentPublisher = async (livekitUrl, jamToken) => {
  const room = new Room();
  const source = new AudioSource(SAMPLE_RATE, CHANNELS);
  const track = LocalAudioTrack.createAudioTrack('mic', source);
  const options = new TrackPublishOptions();
  options.source = TrackSource.SOURCE_MICROPHONE;

  const state = {
    room,
    source,
    track,
    published: false,
    disconnected: false,
    remoteAudioSubs: 0,
  };

  room.on(RoomEvent.Disconnected, () => {
    state.disconnected = true;
  });
  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (track?.kind === TrackKind.KIND_AUDIO) {
      state.remoteAudioSubs += 1;
    }
  });

  await room.connect(livekitUrl, jamToken, {
    autoSubscribe: true,
    dynacast: true,
  });
  await room.localParticipant.publishTrack(track, options);
  state.published = true;
  return state;
};

const pumpSilentAudio = (participants, stopAt) => {
  const tick = async () => {
    while (Date.now() < stopAt) {
      await Promise.all(
        participants.map(async (p) => {
          if (p.disconnected || !p.source) return;
          try {
            const zeros = new Int16Array(FRAME_SAMPLES);
            const frame = new AudioFrame(
              zeros,
              SAMPLE_RATE,
              CHANNELS,
              FRAME_SAMPLES,
            );
            await p.source.captureFrame(frame);
          } catch {
            // ignore closed sources during teardown
          }
        }),
      );
      await sleep(18);
    }
  };
  return tick();
};

const main = async () => {
  if (cfg.video) {
    console.warn(
      'LOADTEST_VIDEO=true is ignored in this harness (audio-only publishers).',
    );
  }
  if (cfg.participants < 2) {
    throw new Error('LOADTEST_PARTICIPANTS must be at least 2');
  }

  console.log(
    `Jam loadtest: ${cfg.participants} publishers, ${cfg.durationSec}s, ${cfg.eventsPerMin} events/min → ${cfg.baseUrl}`,
  );

  const serverInfo = await apiJson('GET', '/api/openpeeps/core/v1/server/info');
  if (!serverInfo?.jams?.livekit?.enabled) {
    throw new Error(
      `LiveKit jams are not enabled on ${cfg.baseUrl} (server/info.jams.livekit.enabled is false). Configure LiveKit on that OpenPeeps instance.`,
    );
  }
  console.log(
    `Server LiveKit URL (from API): ${serverInfo.jams.livekit.url ?? '(omitted)'}`,
  );

  let modToken = cfg.moderatorToken;
  let modProfile;
  if (modToken) {
    modProfile = await apiJson('GET', '/api/openpeeps/core/v1/profiles/current', {
      token: modToken,
    });
  } else {
    const handle = `${cfg.userPrefix}mod`;
    const email = `${handle}@loadtest.local`;
    const auth = await registerOrLogin(handle, email);
    modToken = auth.token;
    modProfile = await apiJson('GET', '/api/openpeeps/core/v1/profiles/current', {
      token: modToken,
    });
  }

  const start = new Date(Date.now() + 60_000).toISOString();
  const end = new Date(Date.now() + 3_600_000).toISOString();
  const event = await apiJson('POST', '/api/openpeeps/core/v1/posts', {
    token: modToken,
    body: {
      type: 'event',
      visibility: 'local',
      data: {
        type: 'event',
        name: `Loadtest jam ${Date.now()}`,
        content: 'Jam load test',
        start,
        end,
        wholeDay: false,
        jam: {
          type: 'video-call',
          videoEnabled: false,
          moderators: [modProfile.id],
          waitingRoom: false,
        },
      },
    },
  });
  const eventId = event.id;
  console.log(`Created jam event ${eventId}`);

  const userSpecs = Array.from({ length: cfg.participants - 1 }, (_, i) => {
    const handle = `${cfg.userPrefix}u${i}`;
    return { handle, email: `${handle}@loadtest.local`, index: i + 1 };
  });

  console.log(`Provisioning ${userSpecs.length} users…`);
  const users = await mapPool(
    userSpecs,
    cfg.registerConcurrency,
    async (spec) => {
      const auth = await registerOrLogin(spec.handle, spec.email);
      const profile = await apiJson(
        'GET',
        '/api/openpeeps/core/v1/profiles/current',
        { token: auth.token },
      );
      return {
        token: auth.token,
        profileId: profile.id,
        handle: spec.handle,
      };
    },
  );
  users.unshift({
    token: modToken,
    profileId: modProfile.id,
    handle: 'moderator',
  });

  const connectDelayMs = Math.max(0, Math.floor(1000 / cfg.connectRps));
  const participants = [];
  let connectOk = 0;
  let publishOk = 0;
  let livekitUrl;

  console.log('Connecting publishers…');
  for (let i = 0; i < users.length; i += 1) {
    const user = users[i];
    const jamAuth = await apiJson(
      'GET',
      `/api/openpeeps/core/v1/jams/${eventId}/token`,
      { token: user.token },
    );
    livekitUrl = jamAuth.livekitUrl;
    const connectedAt = Date.now();
    try {
      const pub = await createSilentPublisher(jamAuth.livekitUrl, jamAuth.token);
      connectOk += 1;
      if (pub.published) publishOk += 1;
      participants.push({
        ...user,
        ...pub,
        connectedAt,
        stayedConnected: true,
        lostPublish: false,
      });
    } catch (err) {
      console.error(`Connect failed for ${user.handle}:`, err.message ?? err);
      participants.push({
        ...user,
        room: null,
        source: null,
        track: null,
        published: false,
        disconnected: true,
        stayedConnected: false,
        lostPublish: true,
        remoteAudioSubs: 0,
        connectedAt,
      });
    }
    if (connectDelayMs > 0 && i < users.length - 1) {
      await sleep(connectDelayMs);
    }
  }

  console.log(
    `Connected ${connectOk}/${users.length}, publishing ${publishOk}/${users.length}`,
  );

  const sentEvents = new Map();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  for (const p of participants) {
    if (!p.room) continue;
    p.room.on(RoomEvent.DataReceived, (payload) => {
      let ev;
      try {
        ev = JSON.parse(decoder.decode(payload));
      } catch {
        return;
      }
      const meta = sentEvents.get(ev.id);
      if (!meta) return;
      const now = Date.now();
      const latency = now - meta.sentAt;
      meta.receives += 1;
      meta.latencies.push(latency);
      if (meta.firstReceiveAt === null) {
        meta.firstReceiveAt = now;
        meta.firstLatencyMs = latency;
      }
    });
  }

  const holdUntil = Date.now() + cfg.durationSec * 1000;
  const audioPump = pumpSilentAudio(
    participants.filter((p) => p.source),
    holdUntil + 2_000,
  );

  const healthSamples = [];
  const healthTimer = setInterval(() => {
    let connected = 0;
    let publishing = 0;
    let remoteSubs = 0;
    for (const p of participants) {
      if (!p.room) {
        p.stayedConnected = false;
        continue;
      }
      const state = p.room.connectionState;
      const isConnected = state === ConnectionState.CONN_CONNECTED;
      if (isConnected) connected += 1;
      else p.stayedConnected = false;
      const stillPublishing =
        isConnected &&
        p.published &&
        !p.disconnected &&
        (p.room.localParticipant?.trackPublications?.size ?? 0) > 0;
      if (stillPublishing) publishing += 1;
      else if (p.published) p.lostPublish = true;
      remoteSubs += p.remoteAudioSubs;
    }
    healthSamples.push({
      at: Date.now(),
      connected,
      publishing,
      remoteSubs,
    });
  }, 5_000);

  const eventIntervalMs = Math.max(50, Math.floor(60_000 / cfg.eventsPerMin));
  let eventSends = 0;
  let eventSendErrors = 0;

  console.log(
    `Steady state ${cfg.durationSec}s (events every ${eventIntervalMs}ms)…`,
  );

  while (Date.now() < holdUntil) {
    const alive = participants.filter((p) => p.room && !p.disconnected);
    if (alive.length === 0) break;
    const sender = alive[Math.floor(Math.random() * alive.length)];
    const type = eventSends % 2 === 0 ? 'message' : 'reaction';
    const id = randomUUID();
    const content =
      type === 'message' ? `loadtest-${eventSends}` : ['👍', '🎉', '❤️', '🔥'][eventSends % 4];
    const body = {
      id,
      jamId: eventId,
      type,
      profileId: sender.profileId,
      content,
    };
    const sentAt = Date.now();
    sentEvents.set(id, {
      sentAt,
      type,
      firstReceiveAt: null,
      firstLatencyMs: null,
      receives: 0,
      latencies: [],
    });
    try {
      await apiJson('POST', `/api/openpeeps/core/v1/jams/${eventId}/events`, {
        token: sender.token,
        body,
      });
      const payload = encoder.encode(JSON.stringify(body));
      const opts =
        type === 'reaction'
          ? { reliable: false, topic: 'reactions' }
          : { reliable: false };
      await sender.room.localParticipant.publishData(payload, opts);
      eventSends += 1;
    } catch (err) {
      eventSendErrors += 1;
      sentEvents.delete(id);
      console.error('Event send failed:', err.message ?? err);
    }
    const remaining = holdUntil - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(eventIntervalMs, remaining));
  }

  // Allow in-flight data packets to arrive
  await sleep(2_000);
  clearInterval(healthTimer);
  await audioPump.catch(() => undefined);

  const delivered = [...sentEvents.values()].filter(
    (e) => e.firstLatencyMs !== null && e.firstLatencyMs <= cfg.maxEventLatencyMs,
  );
  const firstLatencies = delivered
    .map((e) => e.firstLatencyMs)
    .sort((a, b) => a - b);
  const allLatencies = [...sentEvents.values()]
    .flatMap((e) => e.latencies)
    .sort((a, b) => a - b);

  const stayedConnected = participants.filter((p) => p.stayedConnected).length;
  const keptPublishing = participants.filter(
    (p) => p.published && !p.lostPublish && p.stayedConnected,
  ).length;

  const deliveryRate =
    sentEvents.size === 0 ? 1 : delivered.length / sentEvents.size;
  const connectRate = connectOk / users.length;
  const publishRate = publishOk / users.length;
  const stayRate = stayedConnected / users.length;
  const publishStayRate = keptPublishing / users.length;

  const lastHealth = healthSamples[healthSamples.length - 1] ?? null;

  const report = {
    at: new Date().toISOString(),
    config: cfg,
    eventId,
    livekitUrl,
    join: {
      attempted: users.length,
      connected: connectOk,
      published: publishOk,
      connectRate,
      publishRate,
    },
    audio: {
      durationSec: cfg.durationSec,
      stayedConnected,
      keptPublishing,
      stayRate,
      publishStayRate,
      samples: healthSamples.length,
      lastHealth,
    },
    events: {
      sent: sentEvents.size,
      sendErrors: eventSendErrors,
      deliveredWithinSla: delivered.length,
      deliveryRate,
      firstLatencyMs: {
        p50: percentile(firstLatencies, 50),
        p95: percentile(firstLatencies, 95),
        p99: percentile(firstLatencies, 99),
        max: firstLatencies[firstLatencies.length - 1] ?? null,
      },
      allReceiveLatencyMs: {
        p50: percentile(allLatencies, 50),
        p95: percentile(allLatencies, 95),
        p99: percentile(allLatencies, 99),
      },
    },
  };

  const failures = [];
  if (connectRate < cfg.minConnectRate) {
    failures.push(
      `connect rate ${connectRate.toFixed(3)} < ${cfg.minConnectRate}`,
    );
  }
  if (publishRate < cfg.minPublishRate) {
    failures.push(
      `publish rate ${publishRate.toFixed(3)} < ${cfg.minPublishRate}`,
    );
  }
  if (stayRate < cfg.minStayConnectedRate) {
    failures.push(
      `stay-connected rate ${stayRate.toFixed(3)} < ${cfg.minStayConnectedRate}`,
    );
  }
  if (publishStayRate < cfg.minPublishRate) {
    failures.push(
      `publish-stay rate ${publishStayRate.toFixed(3)} < ${cfg.minPublishRate}`,
    );
  }
  if (deliveryRate < cfg.minEventDeliveryRate) {
    failures.push(
      `event delivery rate ${deliveryRate.toFixed(3)} < ${cfg.minEventDeliveryRate} (≤${cfg.maxEventLatencyMs}ms)`,
    );
  }
  report.pass = failures.length === 0;
  report.failures = failures;

  await mkdir(resultsDir, { recursive: true });
  const outPath = join(resultsDir, `jam-${Date.now()}.json`);
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log('\n=== Jam loadtest report ===');
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${outPath}`);

  try {
    await apiJson('PUT', `/api/openpeeps/core/v1/jams/${eventId}/close`, {
      token: modToken,
    });
  } catch (err) {
    console.warn('Jam close failed:', err.message ?? err);
  }

  await Promise.all(
    participants.map(async (p) => {
      try {
        await p.track?.close?.();
      } catch {
        /* ignore */
      }
      try {
        await p.source?.close?.();
      } catch {
        /* ignore */
      }
      try {
        await p.room?.disconnect?.();
      } catch {
        /* ignore */
      }
    }),
  );
  try {
    await dispose();
  } catch {
    /* ignore */
  }

  if (!report.pass) {
    console.error('FAIL:', failures.join('; '));
    process.exit(1);
  }
  console.log('PASS');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
