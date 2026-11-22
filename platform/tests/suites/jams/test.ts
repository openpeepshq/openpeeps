import { expect, test, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import {
  apiHeaders,
  getServerInfo,
  loginUser,
  registerUser,
  uniqueHandle,
} from '../../helpers/api';

const livekitConfigured = () => {
  const key = process.env.JAMS_LIVEKIT_API_KEY ?? '';
  const secret = process.env.JAMS_LIVEKIT_API_SECRET ?? '';
  const url = process.env.JAMS_LIVEKIT_URL ?? '';
  if (!key || !secret || !url) return false;
  if (key.startsWith('APIxxxx') || secret.startsWith('xxxxx')) return false;
  return true;
};

const createPublicJam = async (
  request: APIRequestContext,
  token: string,
  moderatorId: string,
  name: string,
  waitingRoom = false,
) => {
  const create = await request.post('/api/openpeeps/core/v1/posts', {
    headers: apiHeaders(token),
    data: {
      type: 'event',
      visibility: 'public',
      data: {
        type: 'event',
        name,
        content: 'Public jam',
        start: new Date(Date.now() + 60_000).toISOString(),
        end: new Date(Date.now() + 3_600_000).toISOString(),
        wholeDay: false,
        jam: {
          type: 'video-call',
          videoEnabled: true,
          moderators: [moderatorId],
          waitingRoom,
        },
      },
    },
  });
  expect(create.ok(), await create.text()).toBeTruthy();
  return create.json() as Promise<{ id: string }>;
};

/**
 * Read the payload of the next SSE `data:` event off a long-lived stream body.
 * `ping` events carry no `data:` line, so the first `data:` line is a real
 * event (the admittance token or the denial).
 *
 * `timeoutMs` is required: every read races a timer and rejects on expiry, so
 * a stream that never emits (a missed keyspace event) fails the assertion fast
 * instead of hanging the whole test until the Playwright timeout. The
 * parameter cannot be omitted — the bounded read is the only mode, so a
 * future caller cannot silently inherit an unbounded read.
 *
 * The two failure modes are distinguished so a red run is diagnosable from
 * the log alone: `null` means the server closed the stream before emitting a
 * `data:` line, while a timeout rejects with `sseReadTimeoutError` (the stream
 * never emitted).
 */
const sseReadTimeoutError = (timeoutMs: number) => {
  const error = new Error(
    `SSE stream emitted no data event within ${timeoutMs}ms`,
  );
  error.name = 'SseReadTimeoutError';
  return error;
};

const readSseData = async (
  body: ReadableStream<Uint8Array> | null,
  timeoutMs: number,
): Promise<string | null> => {
  if (!body) return null;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timerPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(sseReadTimeoutError(timeoutMs)),
        timeoutMs,
      );
    });
    for (;;) {
      let chunk: Uint8Array | undefined;
      let done = false;
      try {
        const r = await Promise.race([reader.read(), timerPromise]);
        chunk = r.value;
        done = r.done;
      } catch (e) {
        if (e instanceof Error && e.name === 'SseReadTimeoutError') throw e;
        done = true;
      }
      if (done) return null;
      buffer += decoder.decode(chunk!, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          return decodeURIComponent(line.slice('data: '.length));
        }
      }
    }
  } finally {
    if (timer) clearTimeout(timer);
    reader.releaseLock();
  }
};

const issueGuestPass = async (
  request: APIRequestContext,
  jamId: string,
  displayName: string,
) => {
  const guestPass = await request.post(
    '/api/openpeeps/core/v1/auth/guest-pass',
    {
      data: {
        displayName,
        email: `guest-${Date.now()}@openpeeps.test`,
        resource: { type: 'jams', id: jamId },
      },
    },
  );
  expect(guestPass.ok(), await guestPass.text()).toBeTruthy();
  return guestPass.json() as Promise<{ token: string }>;
};

const jamToken = async (
  request: APIRequestContext,
  token: string,
  jamId: string,
) => {
  const response = await request.get(
    `/api/openpeeps/core/v1/jams/${jamId}/token`,
    { headers: apiHeaders(token) },
  );
  expect(
    response.ok(),
    `jam token failed: ${response.status()} ${await response.text()}`,
  ).toBeTruthy();
  return response.json() as Promise<{
    success: boolean;
    token: string;
    livekitUrl: string;
  }>;
};

/** Connect long enough for LiveKit to list the identity as a participant. */
const connectAsParticipant = async (livekitUrl: string, token: string) => {
  const { Room } = await import('@livekit/rtc-node');
  const room = new Room();
  await room.connect(livekitUrl, token, {
    autoSubscribe: false,
    dynacast: false,
  });
  return room;
};

test.describe('Signed-out visitors on waiting-room jams', () => {
  // A headerless visitor must be able to open the jam state (join CTA) and
  // must hit the machine-readable guest-pass 401 on both join and token —
  // never a silent empty body that strands them in a hidden waiting room.
  test('anonymous state read succeeds and join/token return the guest-pass 401', async ({
    request,
  }) => {
    const { token } = await loginUser(
      request,
      'jams-owner@openpeeps.test',
      'testtesttest',
    );
    const me = await request.get('/api/openpeeps/core/v1/profiles/current', {
      headers: apiHeaders(token),
    });
    expect(me.ok()).toBeTruthy();
    const profile = await me.json();

    const event = await createPublicJam(
      request,
      token,
      profile.id,
      `Waiting-room jam ${Date.now()}`,
    );

    const state = await request.get(
      `/api/openpeeps/core/v1/jams/${event.id}/state`,
    );
    expect(
      state.ok(),
      `anonymous jam state failed: ${state.status()} ${await state.text()}`,
    ).toBeTruthy();

    const join = await request.post(
      `/api/openpeeps/core/v1/jams/${event.id}/waiting-room`,
      { data: { displayName: 'Anon Visitor' } },
    );
    expect(join.status()).toBe(401);
    const joinBody = await join.json();
    expect(joinBody.key).toBe('error.jamGuestPassRequired');

    const tokenResponse = await request.get(
      `/api/openpeeps/core/v1/jams/${event.id}/token`,
    );
    expect(tokenResponse.status()).toBe(401);
  });

  // A guest pass holder can queue: the pass carries the jam read scope the
  // join gate requires (plus profiles read for chat author resolution).
  test('guest pass holder can join the waiting room', async ({
    request,
    baseURL,
  }) => {
    const { token } = await loginUser(
      request,
      'jams-owner@openpeeps.test',
      'testtesttest',
    );
    const me = await request.get('/api/openpeeps/core/v1/profiles/current', {
      headers: apiHeaders(token),
    });
    expect(me.ok()).toBeTruthy();
    const profile = await me.json();

    const event = await createPublicJam(
      request,
      token,
      profile.id,
      `Guest queue jam ${Date.now()}`,
    );

    const guest = await issueGuestPass(request, event.id, 'Queue Guest');

    // The join endpoint answers with a long-lived SSE stream (the admittance
    // watch) that stays open until a moderator admits the guest. Playwright's
    // request.post buffers the whole body, so awaiting it hangs until the test
    // timeout; a raw fetch resolves on the headers, so assert on the immediate
    // 2xx (the guest cleared the guest-pass gate and was queued) then abort.
    const controller = new AbortController();
    const join = await fetch(
      `${(baseURL ?? 'http://127.0.0.1:8080').replace(/\/$/, '')}/api/openpeeps/core/v1/jams/${event.id}/waiting-room`,
      {
        method: 'POST',
        headers: apiHeaders(guest.token),
        body: JSON.stringify({ displayName: 'Queue Guest' }),
        signal: controller.signal,
      },
    );
    try {
      if (!join.ok) {
        const detail = await join.text(); // 4xx/5xx bodies are finite JSON
        throw new Error(`guest join failed: ${join.status} ${detail}`);
      }
      expect(join.ok, `guest join not queued: ${join.status}`).toBeTruthy();
    } finally {
      // Release the open admittance stream so the server tears down its
      // redis subscription; the guest is already queued, which is all this
      // test asserts.
      await join.body?.cancel().catch(() => {});
      controller.abort();
    }
  });
});

test.describe('Public jam guests', () => {
  test('guest pass is not rejected as unauthenticated on jam token and profile', async ({
    request,
  }) => {
    const { token } = await loginUser(
      request,
      'jams-owner@openpeeps.test',
      'testtesttest',
    );
    const me = await request.get('/api/openpeeps/core/v1/profiles/current', {
      headers: apiHeaders(token),
    });
    expect(me.ok()).toBeTruthy();
    const profile = await me.json();

    const event = await createPublicJam(
      request,
      token,
      profile.id,
      `Public jam ${Date.now()}`,
    );

    // Open the jam so a guest token can succeed when LiveKit is available.
    if (livekitConfigured()) {
      await jamToken(request, token, event.id);
    }

    const guest = await issueGuestPass(request, event.id, 'Jam Guest');

    const tokenResponse = await request.get(
      `/api/openpeeps/core/v1/jams/${event.id}/token`,
      { headers: apiHeaders(guest.token) },
    );
    expect(tokenResponse.status(), await tokenResponse.text()).not.toBe(401);

    // Jam chat resolves authors via profile GET; ensureAccess accepts guests and
    // jam guest tokens include a profiles read scope for capability checks.
    const profileResponse = await request.get(
      `/api/openpeeps/core/v1/profiles/${profile.id}`,
      { headers: apiHeaders(guest.token) },
    );
    expect(profileResponse.status(), await profileResponse.text()).not.toBe(
      401,
    );
    expect(profileResponse.ok(), await profileResponse.text()).toBeTruthy();
  });

  test('external guest can join, send, and read jam messages', async ({
    request,
  }) => {
    test.skip(
      !livekitConfigured(),
      'Requires real JAMS_LIVEKIT_URL / API_KEY / API_SECRET (not placeholders)',
    );

    const { token: ownerToken } = await loginUser(
      request,
      'jams-owner@openpeeps.test',
      'testtesttest',
    );
    const ownerMe = await request.get(
      '/api/openpeeps/core/v1/profiles/current',
      { headers: apiHeaders(ownerToken) },
    );
    expect(ownerMe.ok()).toBeTruthy();
    const ownerProfile = await ownerMe.json();

    const event = await createPublicJam(
      request,
      ownerToken,
      ownerProfile.id,
      `Guest chat jam ${Date.now()}`,
    );

    const ownerJamAuth = await jamToken(request, ownerToken, event.id);
    const guest = await issueGuestPass(request, event.id, 'Chat Guest');

    const guestMe = await request.get(
      '/api/openpeeps/core/v1/profiles/current',
      { headers: apiHeaders(guest.token) },
    );
    expect(guestMe.ok(), await guestMe.text()).toBeTruthy();
    const guestProfile = await guestMe.json();
    expect(guestProfile.type).toBe('guest');

    const guestJamAuth = await jamToken(request, guest.token, event.id);
    expect(guestJamAuth.success).toBe(true);
    expect(guestJamAuth.token).toBeTruthy();
    expect(guestJamAuth.livekitUrl).toBeTruthy();

    const ownerRoom = await connectAsParticipant(
      ownerJamAuth.livekitUrl,
      ownerJamAuth.token,
    );
    const guestRoom = await connectAsParticipant(
      guestJamAuth.livekitUrl,
      guestJamAuth.token,
    );

    try {
      // Wait briefly so RoomService listParticipants can see both identities.
      await new Promise((resolve) => setTimeout(resolve, 1_000));

      const ownerMessageId = randomUUID();
      const ownerMessageContent = `host hello ${Date.now()}`;
      const ownerMessage = await request.post(
        `/api/openpeeps/core/v1/jams/${event.id}/events`,
        {
          headers: apiHeaders(ownerToken),
          data: {
            id: ownerMessageId,
            jamId: event.id,
            type: 'message',
            profileId: ownerProfile.id,
            content: ownerMessageContent,
          },
        },
      );
      expect(ownerMessage.ok(), await ownerMessage.text()).toBeTruthy();

      const guestMessageId = randomUUID();
      const guestMessageContent = `guest hello ${Date.now()}`;
      const guestMessage = await request.post(
        `/api/openpeeps/core/v1/jams/${event.id}/events`,
        {
          headers: apiHeaders(guest.token),
          data: {
            id: guestMessageId,
            jamId: event.id,
            type: 'message',
            profileId: guestProfile.id,
            content: guestMessageContent,
          },
        },
      );
      expect(guestMessage.ok(), await guestMessage.text()).toBeTruthy();

      const listed = await request.get(
        `/api/openpeeps/core/v1/jams/${event.id}/events`,
        { headers: apiHeaders(guest.token) },
      );
      expect(listed.ok(), await listed.text()).toBeTruthy();
      const events = (await listed.json()) as Array<{
        id: string;
        type: string;
        content?: string;
        profileId: string;
      }>;

      const hostMsg = events.find((e) => e.id === ownerMessageId);
      const guestMsg = events.find((e) => e.id === guestMessageId);
      expect(hostMsg?.type).toBe('message');
      expect(hostMsg?.content).toBe(ownerMessageContent);
      expect(guestMsg?.type).toBe('message');
      expect(guestMsg?.content).toBe(guestMessageContent);

      const hostAuthor = await request.get(
        `/api/openpeeps/core/v1/profiles/${ownerProfile.id}`,
        { headers: apiHeaders(guest.token) },
      );
      expect(hostAuthor.ok(), await hostAuthor.text()).toBeTruthy();
      expect((await hostAuthor.json()).id).toBe(ownerProfile.id);

      const guestAuthor = await request.get(
        `/api/openpeeps/core/v1/profiles/${guestProfile.id}`,
        { headers: apiHeaders(guest.token) },
      );
      expect(guestAuthor.ok(), await guestAuthor.text()).toBeTruthy();
      expect((await guestAuthor.json()).id).toBe(guestProfile.id);
    } finally {
      await guestRoom.disconnect();
      await ownerRoom.disconnect();
    }
  });
});

test.describe('LiveKit jams', () => {
  test.beforeEach(() => {
    test.skip(
      !livekitConfigured(),
      'Requires real JAMS_LIVEKIT_URL / API_KEY / API_SECRET (not placeholders)',
    );
  });

  test('server reports LiveKit enabled and issues a jam token', async ({
    request,
  }) => {
    const info = await getServerInfo(request);
    expect(info.jams.livekit.enabled).toBe(true);
    expect(info.jams.livekit.url).toBeTruthy();

    const { token } = await loginUser(
      request,
      'jams-owner@openpeeps.test',
      'testtesttest',
    );

    const me = await request.get('/api/openpeeps/core/v1/profiles/current', {
      headers: apiHeaders(token),
    });
    expect(me.ok()).toBeTruthy();
    const profile = await me.json();

    const start = new Date(Date.now() + 60_000).toISOString();
    const end = new Date(Date.now() + 3_600_000).toISOString();

    const create = await request.post('/api/openpeeps/core/v1/posts', {
      headers: apiHeaders(token),
      data: {
        type: 'event',
        visibility: 'local',
        data: {
          type: 'event',
          name: `Jam ${Date.now()}`,
          content: 'Integration jam',
          start,
          end,
          wholeDay: false,
          jam: {
            type: 'video-call',
            videoEnabled: true,
            moderators: [profile.id],
            waitingRoom: false,
          },
        },
      },
    });
    expect(
      create.ok(),
      `create jam event failed: ${create.status()} ${await create.text()}`,
    ).toBeTruthy();
    const event = await create.json();
    const eventId = event.id as string;

    const tokenResponse = await request.get(
      `/api/openpeeps/core/v1/jams/${eventId}/token`,
      { headers: apiHeaders(token) },
    );
    expect(
      tokenResponse.ok(),
      `jam token failed: ${tokenResponse.status()} ${await tokenResponse.text()}`,
    ).toBeTruthy();
    const jamAuth = await tokenResponse.json();
    expect(jamAuth.success).toBe(true);
    expect(jamAuth.token).toBeTruthy();
    expect(jamAuth.livekitUrl).toBeTruthy();

    const { RoomServiceClient } = await import('livekit-server-sdk');
    const roomService = new RoomServiceClient(
      process.env.JAMS_LIVEKIT_URL!,
      process.env.JAMS_LIVEKIT_API_KEY!,
      process.env.JAMS_LIVEKIT_API_SECRET!,
    );
    const rooms = await roomService.listRooms([eventId]);
    expect(Array.isArray(rooms)).toBe(true);
  });
});

test.describe('Waiting-room reject', () => {
  // The waiting-room join endpoint answers with a long-lived SSE stream (the
  // guest's admittance watch). Playwright's APIRequest buffers the whole
  // body, so it hangs on a stream that never ends; a raw fetch resolves on
  // the headers, so we open the stream with fetch, read the real events off
  // `response.body`, and abort on the way out.
  const waitingRoomUrl = (baseURL: string, eventId: string) =>
    `${baseURL.replace(/\/$/, '')}/api/openpeeps/core/v1/jams/${eventId}/waiting-room`;

  const openGuestJoinStream = (
    baseURL: string,
    token: string,
    eventId: string,
    displayName: string,
    signal: AbortSignal,
  ) =>
    fetch(waitingRoomUrl(baseURL, eventId), {
      method: 'POST',
      headers: apiHeaders(token),
      body: JSON.stringify({ displayName }),
      signal,
    });

  // Wait until the moderator's queue stream shows the guest's entry. The
  // join response can resolve before the queue entry is durably written, so
  // a reject racing the write could find no entry; observing the entry
  // through the moderator's own stream is the deterministic readiness
  // signal (its first emission already reflects the current queue).
  //
  // The read loop is bounded the same way as `readSseData` one helper up:
  // a queue stream that never emits (a lost first snapshot, or an SSE
  // connection that breaks without EOF) rejects with a typed, diagnosable
  // error instead of hanging the whole test until the Playwright timeout.
  // Only a stream that *ends* takes the `done` path below.
  const waitForQueueEntry = async (
    baseURL: string,
    token: string,
    eventId: string,
    profileId: string,
    timeoutMs = 15_000,
  ) => {
    const response = await fetch(waitingRoomUrl(baseURL, eventId), {
      headers: apiHeaders(token),
    });
    expect(response.ok, `queue watch: ${response.status}`).toBeTruthy();
    try {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timerPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(sseReadTimeoutError(timeoutMs)),
            timeoutMs,
          );
        });
        while (true) {
          let value: Uint8Array | undefined;
          let done = false;
          try {
            const r = await Promise.race([reader.read(), timerPromise]);
            value = r.value;
            done = r.done;
          } catch (e) {
            // Only the queue-wait timeout can reject here; rethrow it with
            // the context its generic message lacks.
            if (e instanceof Error && e.name === 'SseReadTimeoutError') {
              throw new Error(
                `queue stream emitted no data event within ${timeoutMs}ms ` +
                  `(jam=${eventId}, profileId=${profileId}, ` +
                  `queue watch=${response.status})`,
              );
            }
            done = true;
          }
          if (done) {
            throw new Error(
              `queue stream ended before ${profileId} appeared in it ` +
                `(jam=${eventId}, queue watch=${response.status})`,
            );
          }
          buffer += decoder.decode(value, { stream: true });
          for (const line of buffer.split('\n')) {
            if (line.startsWith('data: ')) {
              // SSE data lines are encodeURIComponent-ed; profile ids are
              // encoding-safe, but decode anyway so the match holds.
              if (
                decodeURIComponent(line.slice('data: '.length)).includes(
                  profileId,
                )
              ) {
                return;
              }
            }
          }
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    } finally {
      await response.body?.cancel().catch(() => {});
    }
  };

  test('moderator can reject a queued guest and the guest stream is denied', async ({
    request,
    baseURL,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      'jams-owner@openpeeps.test',
      'testtesttest',
    );
    const ownerMe = await request.get(
      '/api/openpeeps/core/v1/profiles/current',
      {
        headers: apiHeaders(ownerToken),
      },
    );
    expect(ownerMe.ok()).toBeTruthy();
    const ownerProfile = await ownerMe.json();
    const moderatorId = ownerProfile.id as string;

    const event = await createPublicJam(
      request,
      ownerToken,
      moderatorId,
      `Reject jam ${Date.now()}`,
      true,
    );

    // A guest-pass-minted profile (type 'guest') with the jam-scoped read
    // pass — the join goes through the guest-pass branch of
    // requireGuestCapableProfile, and the queue is keyed by this profile's
    // id, so the profile id is resolved from the guest-pass token (reading
    // it this way avoids opening a second SSE stream just to scrape it; the
    // existing "public jam guests" tests resolve the guest the same way).
    const guest = await issueGuestPass(request, event.id, 'Rejected Guest');
    const guestMe = await request.get(
      '/api/openpeeps/core/v1/profiles/current',
      {
        headers: apiHeaders(guest.token),
      },
    );
    expect(guestMe.ok(), await guestMe.text()).toBeTruthy();
    const guestProfileId = (await guestMe.json()).id as string;

    const base = baseURL ?? 'http://127.0.0.1:8080';
    const controller = new AbortController();
    await denyQueuedGuest({
      request,
      base,
      ownerToken,
      eventId: event.id,
      profileId: guestProfileId,
      displayName: 'Rejected Guest',
      openStream: (s) =>
        openGuestJoinStream(base, guest.token, event.id, 'Rejected Guest', s),
      controller,
    });
  });
  /**
   * Run the full denial cycle against a queued guest: the guest holds the
   * admittance-watch stream open, the moderator rejects them, the guest's
   * open stream receives `{ denied: true }`, a non-moderator is refused the
   * same reject with a 403 (pinning the moderation gate for both
   * `requireGuestCapableProfile` auth branches), and a re-join clears the
   * denial and re-queues. Shared by the guest-pass and locally-authenticated
   * cases so the queue-stream/SSE plumbing lives in one place; the cases
   * differ only in the join stream opener (`openStream`).
   */
  const denyQueuedGuest = async ({
    request,
    base,
    ownerToken,
    eventId,
    profileId,
    displayName,
    openStream,
    controller,
  }: {
    request: APIRequestContext;
    base: string;
    ownerToken: string;
    eventId: string;
    profileId: string;
    displayName: string;
    openStream: (signal: AbortSignal) => Promise<Response>;
    controller: AbortController;
  }) => {
    const guestJoin = await openStream(controller.signal);
    let rejoin: Response | undefined;
    try {
      // The streaming client (libraries/fetch-client) resolves `{ data }`
      // from `result.json()` without consulting `result.ok`, so a non-2xx
      // join would surface in the UI as a parse error rather than an API
      // error. This integration test uses raw fetch and asserts `ok`
      // explicitly so that path is still covered at the API level. The
      // fetch-client gap is tracked in #2277: it is shared by every
      // typed streaming endpoint, not specific to this flow.
      expect(
        guestJoin.ok,
        `join not queued (${displayName}): ${guestJoin.status}`,
      ).toBeTruthy();
      expect(guestJoin.body).not.toBeNull();

      // Deterministic readiness: wait until the guest's entry is visible on
      // the moderator's queue stream before rejecting, instead of a fixed
      // 1500 ms sleep. The queue stream's first emission already reflects the
      // current queue, so this observes the entry directly — the reject then
      // always targets a durable queue entry rather than racing the write.
      await waitForQueueEntry(base, ownerToken, eventId, profileId);

      // Reject the guest. The reject endpoint takes no body, so send only the
      // Authorization header — not `apiHeaders`, which also sets
      // `content-type: application/json`. A JSON content-type on an empty body
      // makes the server's request-body parser 400 ("Invalid JSON body") before
      // the handler runs; the real client omits the content-type on bodyless
      // calls, so this mirrors production.
      const deny = await request.post(
        `/api/openpeeps/core/v1/jams/${eventId}/waiting-room/${encodeURIComponent(profileId)}/reject`,
        { headers: { Authorization: `Bearer ${ownerToken}` } },
      );
      expect(
        deny.ok(),
        `reject failed: ${deny.status()} ${await deny.text()}`,
      ).toBeTruthy();

      // The guest's open stream receives the denial event. The read is
      // bounded and distinguishes its failure modes so a red run is
      // diagnosable from the log alone: `null` means the stream closed
      // early, while SseReadTimeoutError means it never emitted.
      let denied: string | null;
      try {
        denied = await readSseData(guestJoin.body, 15_000);
      } catch {
        // Only SseReadTimeoutError can surface from readSseData; rethrow
        // with the context the generic message lacks.
        throw new Error(
          `${displayName} stream emitted no SSE data event within 15s of ` +
            `the reject (profileId=${profileId}, reject=${deny.status()}) — ` +
            `the keyspace denial event was not delivered to the watch`,
        );
      }
      expect(
        denied,
        `${displayName} stream closed before emitting a denial event ` +
          `(profileId=${profileId}, reject=${deny.status()})`,
      ).toBeTruthy();
      expect(JSON.parse(denied as string)).toEqual({ denied: true });

      // A non-moderator cannot reject (mirrors the admit endpoint's 403
      // contract; the authorization check runs before the queue lookup). No
      // body, and no content-type header (see the moderator reject above), so
      // the request reaches the handler and is refused on authorization.
      const outsider = await registerUser(request, {
        handle: uniqueHandle('reject-outsider'),
        email: `reject-outsider-${Date.now()}@openpeeps.test`,
        password: 'testtesttest',
      });
      const outsiderDeny = await request.post(
        `/api/openpeeps/core/v1/jams/${eventId}/waiting-room/${encodeURIComponent(profileId)}/reject`,
        { headers: { Authorization: `Bearer ${outsider.token}` } },
      );
      expect(outsiderDeny.status()).toBe(403);

      // Rejoin succeeds and clears the denial: `joinWaitingRoom` deletes
      // the profile's denial entry before re-queueing, so the 10-minute
      // denial does not survive the re-join attempt — the fresh stream
      // queues the guest again instead of replaying the denial.
      rejoin = await openStream(controller.signal);
      expect(rejoin.ok, `rejoin failed: ${rejoin.status}`).toBeTruthy();
      expect(rejoin.body).not.toBeNull();
      await waitForQueueEntry(base, ownerToken, eventId, profileId);
    } finally {
      // Release the open streams so the server tears down their redis
      // subscriptions; aborting the fetches is belt-and-braces.
      await guestJoin.body?.cancel().catch(() => {});
      await rejoin?.body?.cancel().catch(() => {});
      controller.abort();
    }
  };

  // The guest above is guest-pass-minted (type 'guest', jam-scoped read
  // pass), so its join runs the guest-pass branch of
  // requireGuestCapableProfile. This case covers the other branch the
  // endpoint allows: a locally-authenticated profile with no guest pass at
  // all — the denial path must behave identically for a registered guest.
  test('a locally authenticated queued guest is denied the same way', async ({
    request,
    baseURL,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      'jams-owner@openpeeps.test',
      'testtesttest',
    );
    const ownerMe = await request.get(
      '/api/openpeeps/core/v1/profiles/current',
      {
        headers: apiHeaders(ownerToken),
      },
    );
    expect(ownerMe.ok()).toBeTruthy();
    const moderatorId = (await ownerMe.json()).id as string;

    const event = await createPublicJam(
      request,
      ownerToken,
      moderatorId,
      `Reject local guest jam ${Date.now()}`,
      true,
    );

    const localGuest = await registerUser(request, {
      handle: uniqueHandle('reject-local-guest'),
      email: `reject-local-guest-${Date.now()}@openpeeps.test`,
      password: 'testtesttest',
    });
    const localMe = await request.get(
      '/api/openpeeps/core/v1/profiles/current',
      {
        headers: apiHeaders(localGuest.token),
      },
    );
    expect(localMe.ok(), await localMe.text()).toBeTruthy();
    const localGuestId = (await localMe.json()).id as string;

    const base = baseURL ?? 'http://127.0.0.1:8080';
    const controller = new AbortController();
    await denyQueuedGuest({
      request,
      base,
      ownerToken,
      eventId: event.id,
      profileId: localGuestId,
      displayName: 'Local Guest',
      openStream: (s) =>
        openGuestJoinStream(base, localGuest.token, event.id, 'Local Guest', s),
      controller,
    });
  });

  /**
   * Run the full admission cycle against a queued guest: the guest holds the
   * admittance-watch stream open, the moderator admits them, the guest's open
   * stream receives `{ success, token, livekitUrl }`, and the guest's entry is
   * removed from the queue (a fresh queue snapshot no longer lists it). The
   * happy-path counterpart to `denyQueuedGuest` above: the reject path is
   * integration-pinned but the admit SSE delivery was previously covered only
   * by core unit tests on mocked Redis.
   *
   * Admission mints a LiveKit token for the guest (a non-moderator), and
   * `createJamToken` refuses to mint for a non-moderator unless the room is
   * already open — so the moderator first opens the room via `jamToken` + a
   * LiveKit connection, mirroring the "external guest can join" test. That is
   * why this test, unlike the reject tests, needs a real LiveKit (skipped
   * otherwise).
   */
  const admitQueuedGuest = async ({
    request,
    base,
    ownerToken,
    eventId,
    profileId,
    displayName,
    openStream,
    controller,
  }: {
    request: APIRequestContext;
    base: string;
    ownerToken: string;
    eventId: string;
    profileId: string;
    displayName: string;
    openStream: (signal: AbortSignal) => Promise<Response>;
    controller: AbortController;
  }) => {
    // Open the room so the guest's admission can mint a LiveKit token. The
    // moderator's `/token` call creates the room; connecting a participant
    // guarantees LiveKit lists it (createRoom is only stamped when an
    // instance domain is configured).
    const ownerJamAuth = await jamToken(request, ownerToken, eventId);
    const ownerRoom = await connectAsParticipant(
      ownerJamAuth.livekitUrl,
      ownerJamAuth.token,
    );

    let guestJoin: Response | undefined;
    try {
      guestJoin = await openStream(controller.signal);
      expect(
        guestJoin.ok,
        `join not queued (${displayName}): ${guestJoin.status}`,
      ).toBeTruthy();
      expect(guestJoin.body).not.toBeNull();

      // Deterministic readiness: wait until the guest's entry is visible on
      // the moderator's queue stream before admitting (same signal the reject
      // helper uses), so the admit targets a durable queue entry.
      await waitForQueueEntry(base, ownerToken, eventId, profileId);

      // Admit the guest. The admit endpoint takes no body, so send only the
      // Authorization header (not `apiHeaders`, which also sets a JSON
      // content-type on an empty body — see the reject above).
      const admit = await request.post(
        `/api/openpeeps/core/v1/jams/${eventId}/waiting-room/${encodeURIComponent(profileId)}/admit`,
        { headers: { Authorization: `Bearer ${ownerToken}` } },
      );
      expect(
        admit.ok(),
        `admit failed: ${admit.status()} ${await admit.text()}`,
      ).toBeTruthy();
      expect(await admit.json()).toEqual({ success: true });

      // The guest's open stream receives the admittance token (not a denial).
      // Bounded read; distinguishes a closed stream (null) from a never-
      // emitted one (SseReadTimeoutError) so a red run is diagnosable.
      let granted: string | null;
      try {
        granted = await readSseData(guestJoin.body, 15_000);
      } catch {
        throw new Error(
          `${displayName} stream emitted no SSE data event within 15s of ` +
            `the admit (profileId=${profileId}, admit=${admit.status()}) — ` +
            `the keyspace admission event was not delivered to the watch`,
        );
      }
      expect(
        granted,
        `${displayName} stream closed before emitting an admission event ` +
          `(profileId=${profileId}, admit=${admit.status()})`,
      ).toBeTruthy();
      const admission = JSON.parse(granted as string);
      expect(admission.success).toBe(true);
      expect(admission.denied).toBeUndefined();
      expect(typeof admission.token).toBe('string');
      expect(admission.token.length).toBeGreaterThan(0);
      expect(typeof admission.livekitUrl).toBe('string');
      expect(admission.livekitUrl.length).toBeGreaterThan(0);

      // Queue entry removal: a fresh queue snapshot (its first emission
      // reflects the current queue) no longer lists the admitted guest.
      const queueAfter = await fetch(waitingRoomUrl(base, eventId), {
        headers: apiHeaders(ownerToken),
      });
      expect(queueAfter.ok).toBeTruthy();
      const queueAfterData = await readSseData(queueAfter.body, 15_000);
      await queueAfter.body?.cancel().catch(() => {});
      expect(
        queueAfterData,
        `queue stream emitted no snapshot within 15s of the admit ` +
          `(jam=${eventId})`,
      ).toBeTruthy();
      const queueAfterParsed = JSON.parse(decodeURIComponent(queueAfterData!));
      expect(
        profileId in queueAfterParsed,
        `admitted guest ${profileId} still present in the queue after admit`,
      ).toBe(false);
    } finally {
      // Release the open streams so the server tears down their redis
      // subscriptions; aborting the fetches is belt-and-braces.
      await guestJoin?.body?.cancel().catch(() => {});
      controller.abort();
      await ownerRoom.disconnect().catch(() => {});
    }
  };

  test('moderator can admit a queued guest and the guest stream receives the token', async ({
    request,
    baseURL,
  }) => {
    test.skip(
      !livekitConfigured(),
      'Requires real JAMS_LIVEKIT_URL / API_KEY / API_SECRET (not placeholders)',
    );

    const { token: ownerToken } = await loginUser(
      request,
      'jams-owner@openpeeps.test',
      'testtesttest',
    );
    const ownerMe = await request.get(
      '/api/openpeeps/core/v1/profiles/current',
      { headers: apiHeaders(ownerToken) },
    );
    expect(ownerMe.ok()).toBeTruthy();
    const ownerProfile = await ownerMe.json();
    const moderatorId = ownerProfile.id as string;

    const event = await createPublicJam(
      request,
      ownerToken,
      moderatorId,
      `Admit jam ${Date.now()}`,
      true,
    );

    const guest = await issueGuestPass(request, event.id, 'Admitted Guest');
    const guestMe = await request.get(
      '/api/openpeeps/core/v1/profiles/current',
      { headers: apiHeaders(guest.token) },
    );
    expect(guestMe.ok(), await guestMe.text()).toBeTruthy();
    const guestProfileId = (await guestMe.json()).id as string;

    const base = baseURL ?? 'http://127.0.0.1:8080';
    const controller = new AbortController();
    await admitQueuedGuest({
      request,
      base,
      ownerToken,
      eventId: event.id,
      profileId: guestProfileId,
      displayName: 'Admitted Guest',
      openStream: (s) =>
        openGuestJoinStream(base, guest.token, event.id, 'Admitted Guest', s),
      controller,
    });
  });
});
