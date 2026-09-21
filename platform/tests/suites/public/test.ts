import { expect, test } from '@playwright/test';

test.describe('public community backup', () => {
  test('community name reflects public fixture', async ({ request }) => {
    const info = await request.get('/api/openpeeps/core/v1/server/info');
    expect(info.ok()).toBeTruthy();
    const body = await info.json();
    const name = body.communityConfig?.info?.name ?? '';
    expect(name).toMatch(/Public Test Community|Magic Factory|Community/i);
  });

  test('server advertises publicContent when seeded public', async ({
    request,
  }) => {
    const info = await request.get('/api/openpeeps/core/v1/server/info');
    expect(info.ok()).toBeTruthy();
    const body = await info.json();
    expect(
      body.publicContent,
      'restored public fixture must expose server.publicContent',
    ).toBe(true);
  });

  test('public group is readable without auth', async ({ request }) => {
    const groups = await request.get('/api/openpeeps/core/v1/groups');
    expect(groups.ok(), await groups.text()).toBeTruthy();
    const list = (await groups.json()) as Array<{
      handle?: string;
      capabilities?: { none?: { add?: string[] } };
    }>;
    expect(list.length).toBeGreaterThan(0);

    const publicGroup = list.find((group) =>
      group.capabilities?.none?.add?.includes('core-groups-read'),
    );
    expect(
      publicGroup,
      'expected at least one group with none/core-groups-read',
    ).toBeTruthy();

    const byHandle = await request.get(
      `/api/openpeeps/core/v1/groups/by-handle/${publicGroup!.handle}`,
    );
    expect(byHandle.ok(), await byHandle.text()).toBeTruthy();
  });

  test('explore surface loads without auth', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.locator('body')).toBeVisible();
  });

  test('unauthenticated explore search API responds', async ({ request }) => {
    const response = await request.get(
      '/api/openpeeps/core/v1/search/posts?q=test&limit=5&offset=0',
    );
    // Public communities allow search; closed ones may 401 — either is a signal.
    expect([200, 401, 403]).toContain(response.status());
    if (response.ok()) {
      const results = await response.json();
      expect(Array.isArray(results)).toBe(true);
    }
  });

  test('profile by handle is readable without auth', async ({ request }) => {
    const profiles = await request.get('/api/openpeeps/core/v1/profiles');
    expect(profiles.ok(), await profiles.text()).toBeTruthy();
    const list = (await profiles.json()) as Array<{
      id: string;
      handle: string;
    }>;
    expect(list.length).toBeGreaterThan(0);
    const profile = list[0];

    const byHandle = await request.get(
      `/api/openpeeps/core/v1/profiles/by-handle/${profile.handle}`,
    );
    expect(byHandle.ok(), await byHandle.text()).toBeTruthy();

    const posts = await request.get(
      `/api/openpeeps/core/v1/posts/by-profile/${profile.id}`,
    );
    expect(posts.ok(), await posts.text()).toBeTruthy();
    const postList = (await posts.json()) as Array<{ visibility?: string }>;
    expect(Array.isArray(postList)).toBe(true);
    for (const post of postList) {
      expect(['public', 'group']).toContain(post.visibility);
    }
  });

  test('profile page loads without auth', async ({ page, request }) => {
    const profiles = await request.get('/api/openpeeps/core/v1/profiles');
    expect(profiles.ok(), await profiles.text()).toBeTruthy();
    const list = (await profiles.json()) as Array<{ handle: string }>;
    expect(list.length).toBeGreaterThan(0);

    await page.goto(`/@${list[0].handle}`);
    await expect(page.getByTestId('profile-header-title')).toBeVisible();
  });
});
