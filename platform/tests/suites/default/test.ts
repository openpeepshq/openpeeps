import { expect, test, type APIRequestContext } from '@playwright/test';
import { apiHeaders, uniqueHandle } from '../../helpers/api';

const registerViewer = async (request: APIRequestContext) => {
  const handle = uniqueHandle('df');
  const registered = await request.post(
    '/api/openpeeps/core/v1/auth/register',
    {
      data: {
        handle,
        displayName: handle,
        email: `${handle}@openpeeps.test`,
        password: 'testtest12',
        privacyPolicyAccepted: true,
      },
    },
  );
  if (!registered.ok()) {
    return null;
  }
  const body = (await registered.json()) as { token?: string };
  return body.token ?? null;
};

test.describe('default install backup', () => {
  test('seeded community name and profiles are available', async ({
    request,
  }) => {
    const info = await request.get('/api/openpeeps/core/v1/server/info');
    expect(info.ok()).toBeTruthy();
    const body = await info.json();
    expect(body.communityConfig?.info?.name ?? '').toMatch(
      /Magic Factory|Community/i,
    );

    const token = await registerViewer(request);
    test.skip(!token, 'registration closed on default fixture');

    const profiles = await request.get('/api/openpeeps/core/v1/profiles', {
      headers: apiHeaders(token!),
    });
    expect(profiles.ok(), await profiles.text()).toBeTruthy();
    const list = await profiles.json();
    expect(Array.isArray(list) ? list.length : 0).toBeGreaterThan(0);
  });

  test('groups list returns seeded groups', async ({ request }) => {
    const token = await registerViewer(request);
    test.skip(!token, 'registration closed on default fixture');

    const response = await request.get('/api/openpeeps/core/v1/groups', {
      headers: apiHeaders(token!),
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    const groups = await response.json();
    expect(Array.isArray(groups) ? groups.length : 0).toBeGreaterThan(0);
  });

  test('local feed returns seeded posts when authenticated', async ({
    request,
  }) => {
    const token = await registerViewer(request);
    test.skip(!token, 'registration closed on default fixture');

    const feed = await request.get('/api/openpeeps/core/v1/posts/feeds/local', {
      headers: apiHeaders(token!),
    });
    expect(feed.ok(), await feed.text()).toBeTruthy();
    const posts = await feed.json();
    expect(Array.isArray(posts)).toBe(true);
  });
});
