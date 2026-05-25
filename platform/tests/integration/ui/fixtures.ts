import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Matches `@openpeeps/react` `AUTH_CREDENTIALS_STORAGE_KEY`. */
const credentialsStorageKey = 'auth_credentials';
const password = 'ui-test-password';

type Role = {
  capabilities?: {
    add?: string[];
    remove?: string[];
  };
};

type Profile = {
  handle?: string;
  roles?: Role[];
};

type TestUser = {
  email: string;
  handle: string;
  displayName: string;
  password?: string;
};

type Credentials = { token: string };

export const uiDescription =
  "What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.";

const ownerUser = {
  email: 'test@test.com',
  handle: 'test',
  displayName: 'test',
  password: 'testtest',
};

let uiOwner: { token: string; profile: Profile } | undefined;

export const uniqueSuffix = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const handleSuffix = () => uniqueSuffix().replace(/[^a-z0-9]/g, '');

const can = (profile: Profile, capability: string) =>
  profile.roles?.some((role) =>
    role.capabilities?.add?.some((grantedCapability) => {
      if (grantedCapability === '*') return true;
      if (grantedCapability === capability) return true;
      if (grantedCapability.endsWith('*')) {
        return capability.startsWith(grantedCapability.slice(0, -1));
      }
      return false;
    }),
  ) ?? false;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const register = async (
  request: APIRequestContext,
  user: TestUser,
): Promise<Credentials> => {
  const response = await request.post('/api/openpeeps/core/v1/auth/register', {
    data: {
      handle: user.handle,
      displayName: user.displayName,
      email: user.email,
      password: user.password ?? password,
      privacyPolicyAccepted: true,
    },
  });

  if (!response.ok()) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const credentials = await login(request, user.email, user.password ?? password);
      if (credentials) return credentials;
      await wait(250);
    }
    throw new Error(
      `Could not register or log in test user ${user.email}: ${response.status()} ${await response.text()}`,
    );
  }

  return response.json() as Promise<{ token: string }>;
};

const login = async (
  request: APIRequestContext,
  email: string,
  loginPassword: string,
): Promise<Credentials | undefined> => {
  const response = await request.post('/api/openpeeps/core/v1/auth/login', {
    data: { email, password: loginPassword },
  });

  if (!response.ok()) {
    return undefined;
  }

  return response.json() as Promise<{ token: string }>;
};

const currentProfile = async (request: APIRequestContext, token: string) => {
  const response = await request.get(
    '/api/openpeeps/core/v1/profiles/current',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Profile>;
};

export const signInAsUiUser = async (
  page: Page,
  request: APIRequestContext,
) => {
  let token = uiOwner?.token;
  let profile = uiOwner?.profile;

  if (!token || !profile) {
    token = (await register(request, ownerUser)).token;
    profile = await currentProfile(request, token);

    if (can(profile, 'core-groups-create')) {
      uiOwner = { token, profile };
    }
  }

  expect(
    can(profile, 'core-groups-create'),
    'ui tests need a profile that can create groups',
  ).toBeTruthy();
  expect(
    can(profile, 'core-posts-create-event-local') ||
      can(profile, 'core-posts-create-event'),
    'ui tests need a profile that can create local events',
  ).toBeTruthy();

  await page.addInitScript(
    ([key, authToken]) => {
      window.localStorage.setItem(key, JSON.stringify({ token: authToken }));
    },
    [credentialsStorageKey, token],
  );

  return { token, profile };
};

export const signInAsRegularUiUser = async (
  page: Page,
  request: APIRequestContext,
) => {
  await signInAsUiUser(page, request);

  const suffix = uniqueSuffix();
  const user = {
    email: `ui-member-${suffix}@example.com`,
    handle: `dn${handleSuffix().slice(-14)}`,
    displayName: `UI Member ${suffix}`,
  };

  const { token } = await register(request, user);

  await page.addInitScript(
    ([key, authToken]) => {
      window.localStorage.setItem(key, JSON.stringify({ token: authToken }));
    },
    [credentialsStorageKey, token],
  );

  return { token, user };
};

export const registerViaUi = async (page: Page) => {
  const suffix = uniqueSuffix();
  const handle = `signup${handleSuffix().slice(-10)}`;

  await page.goto('/auth/register');
  await page.getByLabel('Handle').fill(handle);
  await page.getByLabel('Name').fill(`UI Signup ${suffix}`);
  await page.getByLabel('Email').fill(`ui-signup-${suffix}@example.com`);
  await page.getByRole('textbox', { name: /^Password\b/ }).fill(password);
  await page
    .getByRole('textbox', { name: /^Confirm Password\b/ })
    .fill(password);
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: /sign up/i }).click();
  await expect(page).toHaveURL(/\/welcome|\/feeds\/local|\/payment/);
};

export const assertLoginPage = async (page: Page) => {
  await page.goto('/auth/login');
  await expect(page.getByText('Login')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: /^Password\b/ }),
  ).toBeVisible();
};

export const assertLoggedIn = async (page: Page) => {
  await page.goto('/feeds/local');
  await expect(
    page.getByRole('heading', { name: 'Community', exact: true }),
  ).toBeVisible();
};

export const createGroupViaUi = async (
  page: Page,
  options: {
    name?: string;
    handle?: string;
    description?: string;
    rules?: string;
    moderatorsOnlyEvents?: boolean;
  } = {},
) => {
  const suffix = uniqueSuffix();
  const groupName = options.name ?? `UI Group ${suffix}`;
  const groupHandle = options.handle ?? `ui${handleSuffix().slice(-14)}`;

  await page.goto('/groups/new');
  await expect(page.getByText('Create group')).toBeVisible();
  await page.getByLabel('Group Name').fill(groupName);
  await page.getByLabel('Handle').fill(groupHandle);

  if (options.description) {
    await page.getByLabel('Description').fill(options.description);
  }

  if (options.rules) {
    await page.getByLabel('Group Rules').fill(options.rules);
  }

  if (options.moderatorsOnlyEvents) {
    await page
      .getByRole('radio', { name: /Only moderators can add events/i })
      .check();
  } else {
    await page
      .getByRole('radio', { name: /All members can add events/i })
      .check();
  }

  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(new RegExp(`/groups/@${groupHandle}$`));
  await expect(
    page.getByRole('heading', { name: groupName, level: 1 }),
  ).toBeVisible();

  return { groupName, groupHandle };
};

export const createEventViaUi = async (
  page: Page,
  options: { name?: string; description?: string } = {},
) => {
  const eventName = options.name ?? `New UI Event ${uniqueSuffix()}`;

  await page.goto('/events/new');
  await expect(page.getByText('Basic Details')).toBeVisible();
  await page.getByLabel('Event name').fill(eventName);
  await page
    .getByPlaceholder('Describe your event')
    .fill(options.description ?? uiDescription);
  await expect(
    page.getByRole('button', { name: 'Create event' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Create event' }).click();
  await expect(page).toHaveURL(/\/posts\/[^/]+$/);
  await expect(page.getByText(eventName)).toBeVisible();

  return eventName;
};

export const createPostViaUi = async (page: Page, content?: string) => {
  const postContent = content ?? `Hello World ${uniqueSuffix()}`;

  await page.goto('/feeds/local');
  await page.getByRole('button', { name: 'New Post' }).click();
  await page.getByPlaceholder("what's on your mind?").fill(postContent);
  const submitButton = page.getByRole('button', { name: 'Post', exact: true });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  await expect(page.getByText(postContent)).toBeVisible();
  await page.reload();
  await expect(page.getByText(postContent)).toBeVisible();

  return postContent;
};

export const assertExploreNoResults = async (page: Page) => {
  const search = `noresults${handleSuffix()}`;
  await page.goto(`/explore?q=${search}`);
  await expect(
    page.getByRole('heading', { name: 'No profiles found', exact: true }),
  ).toBeVisible();
};

export const assertExploreFindsPost = async (page: Page) => {
  const content = `muffinsalt ${uniqueSuffix()}`;
  await createPostViaUi(page, content);
  await page.goto('/explore#posts');
  await page.getByPlaceholder(/search/i).fill(content);
  await page.keyboard.press('Enter');
  await expect(page.getByText(content)).toBeVisible();
};

export const assertSettingsPages = async (page: Page) => {
  await page.goto('/settings');
  await expect(
    page.locator('a[href="/settings/public-profile"]'),
  ).toBeVisible();
  await expect(page.locator('a[href="/settings/account"]')).toBeVisible();
  await expect(
    page.locator('a[href="/settings/notifications"]'),
  ).toBeVisible();
  await expect(page.locator('a[href="/settings/theme"]')).toBeVisible();

  await page.goto('/settings/public-profile');
  await expect(page.getByLabel('Display Name')).toBeVisible();
  await expect(page.getByLabel('Handle')).toBeVisible();
  await expect(page.getByLabel('Bio')).toBeVisible();

  await page.goto('/settings/account');
  await expect(page.getByLabel('Current Password')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();

  await page.goto('/settings/notifications');
  await expect(
    page.locator('a[href="/settings/notifications/preferences"]'),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/settings/notifications/push-enabled-devices"]'),
  ).toBeVisible();
  await page.goto('/settings/notifications/preferences');
  await expect(
    page.getByRole('button', { name: /submit|save/i }),
  ).toBeVisible();
};

export const updateBioViaUi = async (page: Page, bio?: string) => {
  const newBio = bio ?? `New Bio ${uniqueSuffix()}`;

  await page.goto('/settings/public-profile');
  await page.getByLabel('Bio').fill(newBio);
  await page.getByRole('button', { name: /submit|save/i }).click();
  await page.reload();
  await expect(page.getByLabel('Bio')).toHaveValue(newBio);

  return newBio;
};

export const assertMembersPage = async (page: Page) => {
  await page.goto('/members');
  await expect(
    page.getByPlaceholder('Search member by name or handle'),
  ).toBeVisible();
};

export const assertAdminConfiguration = async (page: Page) => {
  await page.goto('/admin/configuration');
  await expect(
    page.getByRole('heading', { name: 'Configuration', exact: true }),
  ).toBeVisible();
};

export const assertAdminInvites = async (page: Page) => {
  await page.goto('/admin/invites');
  await expect(
    page.getByRole('button', { name: 'New Invite' }),
  ).toBeVisible();
};

export const assertBillingPage = async (page: Page) => {
  await page.goto('/settings');
  const billingLink = page.getByRole('link', { name: /^Billing\b/ });
  if (!(await billingLink.isVisible())) {
    await expect(
      page.getByRole('heading', { name: 'Settings', exact: true }),
    ).toBeVisible();
    return;
  }

  await billingLink.click();
  await expect(
    page.getByRole('heading', { name: 'Billing & Subscription', exact: true }),
  ).toBeVisible();
};

export const assertJamsPage = async (page: Page) => {
  await page.goto('/jams');
  await expect(
    page.getByRole('heading', { name: 'Jams', exact: true }),
  ).toBeVisible();
};
