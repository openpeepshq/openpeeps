import { expect, test } from '@playwright/test';
import {
  apiHeaders,
  currentProfile,
  loginUser,
  registerUser,
  uniqueHandle,
} from '../../../helpers';
import {
  listenSessionEvents,
  waitForSessionEvent,
} from '../../../helpers/sessionEvents';

const owner = {
  email: 'test@test.com',
  password: 'testtest',
};

test.describe('session SSE', () => {
  test('follow notification arrives on the recipient session channel', async ({
    request,
  }, testInfo) => {
    const baseURL = String(
      testInfo.project.use.baseURL ?? 'http://127.0.0.1:8080',
    );
    const handle = uniqueHandle('ss');
    const { token: memberToken } = await registerUser(request, {
      handle,
      email: `${handle}@openpeeps.test`,
      password: 'testtest12',
    });
    const memberProfile = await currentProfile(request, memberToken);
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );

    const listener = await listenSessionEvents(baseURL, memberToken);
    try {
      const follow = await request.post(
        `/api/openpeeps/core/v1/profiles/${memberProfile.id}/follow`,
        { headers: apiHeaders(ownerToken), data: {} },
      );
      expect(follow.ok(), await follow.text()).toBeTruthy();

      await waitForSessionEvent(
        listener,
        (event) =>
          event.type === 'invalidate' &&
          /followed you/i.test(event.notification?.title ?? ''),
      );

      const event = listener.events.find(
        (entry) =>
          entry.type === 'invalidate' &&
          /followed you/i.test(entry.notification?.title ?? ''),
      );
      expect(event?.notificationStats).toEqual(
        expect.objectContaining({
          unread: expect.any(Number),
          unseen: expect.any(Number),
        }),
      );
      expect(event?.notification?.invalidateQueries).toEqual(
        expect.arrayContaining([expect.arrayContaining(['profiles'])]),
      );
    } finally {
      await listener.close();
    }
  });
});
