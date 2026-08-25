import { expect, test, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { apiHeaders, getServerInfo, loginUser } from '../../helpers/api';

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
          waitingRoom: false,
        },
      },
    },
  });
  expect(create.ok(), await create.text()).toBeTruthy();
  return create.json() as Promise<{ id: string }>;
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
