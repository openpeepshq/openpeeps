import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { testIds } from '../testIds';

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
  await page.getByTestId(testIds.auth.registerHandle).fill(handle);
  await page.getByTestId(testIds.auth.registerName).fill(`UI Signup ${suffix}`);
  await page.getByTestId(testIds.auth.registerEmail).fill(`ui-signup-${suffix}@example.com`);
  await page.getByTestId(testIds.auth.registerPassword).fill(password);
  await page.getByTestId(testIds.auth.registerConfirmPassword).fill(password);
  await page.getByTestId(testIds.auth.registerPrivacyCheckbox).check();
  await page.getByTestId(testIds.auth.registerSubmit).click();
  await expect(page).toHaveURL(/\/welcome|\/feeds\/local|\/payment/);
};

export const assertLoginPage = async (page: Page) => {
  await page.goto('/auth/login');
  await expect(page.getByTestId(testIds.auth.loginTitle)).toBeVisible();
  await expect(page.getByTestId(testIds.auth.loginEmail)).toBeVisible();
  await expect(page.getByTestId(testIds.auth.loginPassword)).toBeVisible();
};

export const assertLoggedIn = async (page: Page) => {
  await page.goto('/feeds/local');
  await expect(page.getByTestId(testIds.feeds.communityHeading)).toBeVisible();
};

export const createGroupViaUi = async (
  page: Page,
  options: {
    name?: string;
    handle?: string;
    description?: string;
    rules?: string;
    adminsOnlyEvents?: boolean;
  } = {},
) => {
  const suffix = uniqueSuffix();
  const groupName = options.name ?? `UI Group ${suffix}`;
  const groupHandle = options.handle ?? `ui${handleSuffix().slice(-14)}`;

  await page.goto('/groups/new');
  await expect(page.getByTestId(testIds.groups.createPageTitle)).toBeVisible();
  await page.getByTestId(testIds.groups.nameInput).fill(groupName);
  await page.getByTestId(testIds.groups.handleInput).fill(groupHandle);

  if (options.description) {
    await page.getByTestId(testIds.groups.descriptionInput).fill(options.description);
  }

  if (options.rules) {
    await page.getByTestId(testIds.groups.rulesInput).fill(options.rules);
  }

  const whoCanPostEventsMembers = page.getByTestId(
    testIds.groups.whoCanPostEventsMembers,
  );
  if (await whoCanPostEventsMembers.isVisible()) {
    if (options.adminsOnlyEvents) {
      await page.getByTestId(testIds.groups.whoCanPostEventsAdmin).check();
    } else {
      await whoCanPostEventsMembers.check();
    }
  }

  await page.getByTestId(testIds.groups.createSubmit).click();
  await expect(page).toHaveURL(new RegExp(`/groups/@${groupHandle}$`));
  await expect(page.getByTestId(testIds.groups.headerTitle)).toHaveText(groupName);

  return { groupName, groupHandle };
};

export const createEventViaUi = async (
  page: Page,
  options: { name?: string; description?: string } = {},
) => {
  const eventName = options.name ?? `New UI Event ${uniqueSuffix()}`;

  const newEventButton = page.getByTestId(testIds.events.newEventButton);
  const onGroupEvents =
    (await page.getByTestId(testIds.groups.tabEvents).isVisible()) &&
    /#events$/.test(page.url());
  if (onGroupEvents) {
    await newEventButton.waitFor({ state: 'visible', timeout: 15_000 });
    await newEventButton.click();
  } else if (await newEventButton.isVisible()) {
    await newEventButton.click();
  } else {
    await page.goto('/events/new');
  }
  await expect(page.getByTestId(testIds.events.formBasicDetails)).toBeVisible();
  await page.getByTestId(testIds.events.nameInput).fill(eventName);
  await page
    .getByTestId(testIds.events.descriptionInput)
    .fill(options.description ?? uiDescription);
  const startInput = page.getByTestId(testIds.events.startInput);
  const startValue = await startInput.inputValue();
  if (!startValue) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    await startInput.fill(tomorrow.toISOString().slice(0, 16));
  }
  await expect(page.getByTestId(testIds.events.createSubmit)).toBeEnabled();
  await page.getByTestId(testIds.events.createSubmit).click();
  await expect(page).toHaveURL(/\/posts\/[^/]+$/);
  await expect(page.getByText(eventName)).toBeVisible();

  return eventName;
};

export const createPostViaUi = async (page: Page, content?: string) => {
  const postContent = content ?? `Hello World ${uniqueSuffix()}`;

  await page.goto('/feeds/local');
  await page.getByTestId(testIds.posts.newPostButton).click();
  await page.getByTestId(testIds.posts.composerContent).fill(postContent);
  const submitButton = page.getByTestId(testIds.posts.composerPublish);
  await expect(submitButton).toBeEnabled();
  const createPost = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/posts(\?|$)/.test(new URL(response.url()).pathname) &&
      response.ok(),
  );
  await submitButton.click();
  await createPost;
  await expect(page.getByTestId(testIds.posts.composerContent)).not.toBeVisible();
  await page.reload();
  await expect(page.getByTestId(testIds.feeds.communityHeading)).toBeVisible();
  await expect(page.getByText(postContent)).toBeVisible();

  return postContent;
};

export const assertExploreNoResults = async (page: Page) => {
  const search = `noresults${handleSuffix()}`;
  await page.goto(`/explore?q=${search}`);
  await expect(page.getByTestId(testIds.explore.noProfilesFound)).toBeVisible();
};

export const assertExploreFindsPost = async (page: Page) => {
  const content = `muffinsalt${handleSuffix()}`;
  await createPostViaUi(page, content);

  const token = await page.evaluate(
    ([key]) => {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { token?: string }).token : undefined;
    },
    [credentialsStorageKey],
  );
  expect(token).toBeTruthy();

  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          `/api/openpeeps/core/v1/search/posts?q=${encodeURIComponent(content)}&limit=15&offset=0`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok()) return false;
        const results = (await response.json()) as Array<{
          data: { data: { content?: string } };
        }>;
        return results.some((item) => item.data.data.content?.includes(content));
      },
      { timeout: 45_000, intervals: [500, 1000, 2000] },
    )
    .toBe(true);

  await page.goto('/explore#posts');
  await page.getByTestId(testIds.explore.searchInput).fill(content);
  await page.keyboard.press('Enter');
  await expect(page.getByText(content)).toBeVisible();
};

export const assertSettingsPages = async (page: Page) => {
  await page.goto('/settings');
  await expect(page.getByTestId(testIds.settings.linkPublicProfile)).toBeVisible();
  await expect(page.getByTestId(testIds.settings.linkAccount)).toBeVisible();
  await expect(page.getByTestId(testIds.settings.linkNotifications)).toBeVisible();
  await expect(page.getByTestId(testIds.settings.linkTheme)).toBeVisible();

  await page.goto('/settings/public-profile');
  await expect(page.getByTestId(testIds.settings.displayNameInput)).toBeVisible();
  await expect(page.getByTestId(testIds.settings.handleInput)).toBeVisible();
  await expect(page.getByTestId(testIds.settings.bioInput)).toBeVisible();

  await page.goto('/settings/account');
  await expect(page.getByTestId(testIds.settings.currentPasswordInput)).toBeVisible();
  await expect(page.getByTestId(testIds.settings.emailInput)).toBeVisible();

  await page.goto('/settings/notifications');
  await expect(
    page.getByTestId(testIds.settings.notificationsPreferencesLink),
  ).toBeVisible();
  await expect(page.getByTestId(testIds.settings.pushDevicesLink)).toBeVisible();
  await page.goto('/settings/notifications/preferences');
  await expect(page.getByTestId(testIds.settings.saveButton)).toBeVisible();
};

export const updateBioViaUi = async (page: Page, bio?: string) => {
  const newBio = bio ?? `New Bio ${uniqueSuffix()}`;

  await page.goto('/settings/public-profile');
  await page.getByTestId(testIds.settings.bioInput).fill(newBio);
  await page.getByTestId(testIds.settings.saveButton).click();
  await expect(page.getByText(/profile has been updated/i)).toBeVisible();
  await page.reload();
  await expect(page.getByTestId(testIds.settings.bioInput)).toHaveValue(newBio);

  return newBio;
};

export const assertMembersPage = async (page: Page) => {
  await page.goto('/members');
  await expect(page.getByTestId(testIds.members.searchInput)).toBeVisible();
};

export const assertAdminConfiguration = async (page: Page) => {
  await page.goto('/admin/configuration');
  await expect(page.getByTestId(testIds.admin.configurationHeading)).toBeVisible();
};

/** Owner profile from global setup (`test@test.com` / `@test`). */
export const ownerProfileHandle = 'test';

export const assertProfilePage = async (
  page: Page,
  handle = ownerProfileHandle,
) => {
  await page.goto(`/@${handle}`);
  await expect(page.getByTestId(testIds.profile.headerTitle)).toHaveText(handle);
};

export const assertProfileFollowersPage = async (
  page: Page,
  handle = ownerProfileHandle,
) => {
  await page.goto(`/@${handle}/followers`);
  await expect(page.getByTestId(testIds.profile.followersHeading)).toContainText(
    handle,
  );
};

export const assertProfileFollowingPage = async (
  page: Page,
  handle = ownerProfileHandle,
) => {
  await page.goto(`/@${handle}/following`);
  await expect(page.getByTestId(testIds.profile.followingHeading)).toContainText(
    handle,
  );
};

export const assertProfileRoutes = async (page: Page) => {
  await assertProfilePage(page);
  await assertProfileFollowersPage(page);
  await assertProfileFollowingPage(page);

  await page.goto('/explore');
  await expect(page.getByTestId(testIds.explore.searchInput)).toBeVisible();

  const missingHandle = `missing${handleSuffix()}`;
  await page.goto(`/@${missingHandle}`);
  await expect(page.getByTestId(testIds.profile.notFoundTitle)).toBeVisible();
};

export const assertAdminInvites = async (page: Page) => {
  await page.goto('/admin/invites');
  await expect(page.getByTestId(testIds.admin.newInviteButton)).toBeVisible();
};

export const assertBillingPage = async (page: Page) => {
  await page.goto('/settings');
  const billingLink = page.getByTestId(testIds.settings.linkBilling);
  if (!(await billingLink.isVisible())) {
    await expect(page.getByTestId(testIds.settings.pageHeading)).toBeVisible();
    return;
  }

  await billingLink.click();
  await expect(page.getByTestId(testIds.settings.billingHeading)).toBeVisible();
};

export const assertJamsPage = async (page: Page) => {
  await page.goto('/jams');
  await expect(page.getByTestId(testIds.jams.pageHeading)).toBeVisible();
};
