import { expect, test } from '@playwright/test';
import { apiHeaders, getServerInfo, loginUser } from '../../helpers/api';

const livekitConfigured = () => {
  const key = process.env.JAMS_LIVEKIT_API_KEY ?? '';
  const secret = process.env.JAMS_LIVEKIT_API_SECRET ?? '';
  const url = process.env.JAMS_LIVEKIT_URL ?? '';
  if (!key || !secret || !url) return false;
  if (key.startsWith('APIxxxx') || secret.startsWith('xxxxx')) return false;
  return true;
};

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
    const jamToken = await tokenResponse.json();
    expect(jamToken.success).toBe(true);
    expect(jamToken.token).toBeTruthy();
    expect(jamToken.livekitUrl).toBeTruthy();

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
