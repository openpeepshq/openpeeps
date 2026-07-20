import { expect, test } from '@playwright/test';
import {
  clearMailpit,
  createWebhookPushSubscription,
  loginUser,
  queueTestEmail,
  sendTestPush,
  startPushCatcher,
  waitForMailpitMessage,
  waitForPush,
} from '../../../helpers';

const owner = {
  email: 'test@test.com',
  password: 'testtest',
};

test.describe('email + push', () => {
  test('admin test email is delivered via Mailpit', async ({ request }) => {
    await clearMailpit();
    const { token } = await loginUser(request, owner.email, owner.password);
    const to = `mailpit+${Date.now()}@openpeeps.test`;

    await queueTestEmail(request, token, to);

    const message = await waitForMailpitMessage(
      (mail) =>
        mail.To.some((recipient) => recipient.Address === to) &&
        /test email/i.test(mail.Subject),
      { timeoutMs: 45_000 },
    );

    expect(message.Subject).toMatch(/test email/i);
  });

  test('webhook push subscription receives test notification', async ({
    request,
  }) => {
    const catcher = await startPushCatcher();
    try {
      const { token } = await loginUser(request, owner.email, owner.password);
      await createWebhookPushSubscription(
        request,
        token,
        catcher.url,
        catcher.publicKey,
      );
      const result = await sendTestPush(request, token, catcher.publicKey);
      expect(result.success !== false).toBeTruthy();

      // Compose catcher exposes GET /pushes; CI http-echo only proves delivery.
      if (process.env.PUSH_CATCHER_ASSERT === 'delivery-only') {
        return;
      }

      const push = await waitForPush(catcher);
      expect(push.body).toBeTruthy();
      const body = push.body as {
        notification?: { title?: string };
      };
      expect(body.notification?.title ?? JSON.stringify(push.body)).toMatch(
        /test/i,
      );
    } finally {
      await catcher.close();
    }
  });
});
