import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import {
  apiHeaders,
  createEvent,
  createGroup,
  createNote,
  currentProfile as fetchCurrentProfile,
  registerUser,
  uniqueHandle,
} from '../../../helpers/api';
import { testIds } from '../testIds';

/** Matches `@openpeepshq/react` `AUTH_CREDENTIALS_STORAGE_KEY`. */
export const credentialsStorageKey = 'auth_credentials';
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
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const credentials = await login(
        request,
        user.email,
        user.password ?? password,
      );
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
    const credentials =
      (await login(request, ownerUser.email, ownerUser.password)) ??
      (await register(request, ownerUser));
    token = credentials.token;
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
  await page
    .getByTestId(testIds.auth.registerEmail)
    .fill(`ui-signup-${suffix}@example.com`);
  await page.getByTestId(testIds.auth.registerPassword).fill(password);
  await page.getByTestId(testIds.auth.registerConfirmPassword).fill(password);
  await page.getByTestId(testIds.auth.registerPrivacyCheckbox).check();
  await page.getByTestId(testIds.auth.registerSubmit).click();
  await expect(page).toHaveURL(/\/welcome|\/feeds\/local|\/payment/);
};

export const loginViaUi = async (
  page: Page,
  email = ownerUser.email,
  loginPassword = ownerUser.password,
) => {
  await page.goto('/auth/login');
  await page.getByTestId(testIds.auth.loginEmail).fill(email);
  await page.getByTestId(testIds.auth.loginPassword).fill(loginPassword);
  await page.getByTestId(testIds.auth.loginSubmit).click();
  await expect(page).toHaveURL(/\/feeds\/local|\/welcome/);
  await page.goto('/feeds/local');
  await expect(page.getByTestId(testIds.feeds.communityHeading)).toBeVisible();
};

export const assertLoginPage = async (page: Page) => {
  await page.goto('/auth/login');
  await expect(page.getByTestId(testIds.auth.loginTitle)).toBeVisible();
  await expect(page.getByTestId(testIds.auth.loginEmail)).toBeVisible();
  await expect(page.getByTestId(testIds.auth.loginPassword)).toBeVisible();
  await expect(page.getByTestId(testIds.auth.loginSubmit)).toBeVisible();
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
    await page
      .getByTestId(testIds.groups.descriptionInput)
      .fill(options.description);
  }

  if (options.rules) {
    await page.getByTestId(testIds.groups.rulesInput).fill(options.rules);
  }

  if (options.adminsOnlyEvents) {
    await page
      .getByTestId(testIds.groups.template('announcementGroup'))
      .check();
  }

  await page.getByTestId(testIds.groups.createSubmit).click();
  await expect(page).toHaveURL(new RegExp(`/groups/@${groupHandle}$`));
  await expect(page.getByTestId(testIds.groups.headerTitle)).toHaveText(
    groupName,
  );

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
  const createPostResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/posts\/?$/.test(new URL(response.url()).pathname),
  );
  await page.getByTestId(testIds.posts.composerContent).fill(postContent);
  const submitButton = page.getByTestId(testIds.posts.composerPublish);
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  const response = await createPostResponse;
  expect(response.ok(), `create post failed: ${response.status()}`).toBe(true);
  await expect(
    page.getByTestId(testIds.posts.composerContent),
  ).not.toBeVisible();
  await page.reload();
  await expect(page.getByTestId(testIds.feeds.communityHeading)).toBeVisible();
  await expect(page.getByText(postContent)).toBeVisible();

  return postContent;
};

export const createPollViaUi = async (
  page: Page,
  options: { question?: string; choices?: string[] } = {},
) => {
  const question = options.question ?? `UI poll ${uniqueSuffix()}`.slice(0, 80);
  const choices = options.choices ?? ['Alpha', 'Bravo'];

  await page.goto('/feeds/local');
  await page.getByTestId(testIds.posts.newPostButton).click();
  await page.getByTestId(testIds.posts.composerPollType).click();
  await expect(page.getByTestId(testIds.posts.pollOption(1))).toBeVisible();
  await page.getByTestId(testIds.posts.composerContent).fill(question);
  for (let index = 0; index < choices.length; index += 1) {
    const optionTestId = testIds.posts.pollOption(index + 1);
    if (!(await page.getByTestId(optionTestId).isVisible())) {
      await page.getByRole('button', { name: /add option/i }).click();
    }
    await page.getByTestId(optionTestId).fill(choices[index]!);
  }

  const createPostResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/posts\/?$/.test(new URL(response.url()).pathname),
  );
  const submitButton = page.getByTestId(testIds.posts.composerPublish);
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  const response = await createPostResponse;
  expect(response.ok(), `create poll failed: ${response.status()}`).toBe(true);
  await page.reload();
  const published = page.locator('a').filter({ hasText: question }).first();
  await expect(published).toBeVisible();
  await expect(published.getByText(choices[0]!)).toBeVisible();

  return { question, choices };
};

export const repostFirstPostViaUi = async (page: Page, content: string) => {
  await expect(page.getByText(content)).toBeVisible();
  const repostResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/reposts\/?$/.test(new URL(response.url()).pathname),
  );
  await page.getByTestId(testIds.posts.repostButton).first().click();
  const response = await repostResponse;
  expect(response.ok(), `repost failed: ${response.status()}`).toBe(true);
};

type ExploreTabId = 'members' | 'posts' | 'jams' | 'events' | 'groups';

type SearchCounts = {
  profiles: number;
  posts: number;
  jams: number;
  events: number;
  groups: number;
};

const exploreTabs: Array<{
  id: ExploreTabId;
  label: string;
  empty: string;
  countKey: keyof SearchCounts;
}> = [
  {
    id: 'members',
    label: 'Members',
    empty: 'No profiles found',
    countKey: 'profiles',
  },
  {
    id: 'posts',
    label: 'Posts',
    empty: 'No posts found',
    countKey: 'posts',
  },
  { id: 'jams', label: 'Jams', empty: 'No jams found', countKey: 'jams' },
  {
    id: 'events',
    label: 'Events',
    empty: 'No events found',
    countKey: 'events',
  },
  {
    id: 'groups',
    label: 'Groups',
    empty: 'No groups found',
    countKey: 'groups',
  },
];

/** One lexeme so English full-text search does not split the needle. */
const uniqueSearchWord = (prefix: string) => {
  const suffix = Array.from({ length: 8 }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join('');
  return `${prefix}${suffix}`;
};

const readAuthToken = async (page: Page) => {
  const token = await page.evaluate(
    ([key]) => {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { token?: string }).token : undefined;
    },
    [credentialsStorageKey] as const,
  );
  if (!token) {
    throw new Error('missing auth token');
  }
  return token;
};

const exploreNav = (page: Page) =>
  page.getByRole('navigation', { name: 'Result types' });

const expectExploreTab = async (
  page: Page,
  tab: (typeof exploreTabs)[number],
  count: number,
  visible: string | undefined,
  hidden: string[],
) => {
  const button = exploreNav(page).getByRole('button', {
    name: new RegExp(`^${tab.label}`),
  });
  await button.click();
  await expect(button).toHaveText(new RegExp(`^${tab.label}\\s*${count}$`));

  const results = page.getByTestId(testIds.explore.results);
  if (tab.id === 'members') {
    await expect(
      results.getByTestId(testIds.explore.noProfilesFound),
    ).toHaveCount(visible ? 0 : 1);
  } else {
    await expect(
      results.getByRole('heading', { name: tab.empty, exact: true }),
    ).toHaveCount(visible ? 0 : 1);
  }

  if (visible) {
    await expect(
      results.getByText(visible, { exact: true }).first(),
    ).toBeVisible();
  }
  for (const word of hidden) {
    await expect(results.getByText(word, { exact: true })).toHaveCount(0);
  }
};

export const assertExploreNoResults = async (page: Page) => {
  const search = `noresults${handleSuffix()}`;
  await page.goto(`/explore?q=${encodeURIComponent(search)}`);
  for (const tab of exploreTabs) {
    await expectExploreTab(page, tab, 0, undefined, []);
  }
};

type SearchNeedle = 'post' | 'event' | 'jam' | 'group' | 'member' | 'dm';

/**
 * Post search includes every non-direct post, so an event or jam title also
 * appears on Posts. Direct messages are excluded. Jams are events that have
 * a jam, so a plain event stays off the Jams tab.
 */
const tabsForNeedle: Record<SearchNeedle, ExploreTabId[]> = {
  post: ['posts'],
  event: ['posts', 'events'],
  jam: ['posts', 'events', 'jams'],
  group: ['groups'],
  member: ['members'],
  dm: [],
};

const countsForNeedle: Record<SearchNeedle, SearchCounts> = {
  post: { profiles: 0, posts: 1, jams: 0, events: 0, groups: 0 },
  event: { profiles: 0, posts: 1, jams: 0, events: 1, groups: 0 },
  jam: { profiles: 0, posts: 1, jams: 1, events: 1, groups: 0 },
  group: { profiles: 0, posts: 0, jams: 0, events: 0, groups: 1 },
  member: { profiles: 1, posts: 0, jams: 0, events: 0, groups: 0 },
  dm: { profiles: 0, posts: 0, jams: 0, events: 0, groups: 0 },
};

const fetchSearchCounts = async (page: Page, token: string, query: string) => {
  const response = await page.request.get(
    `/api/openpeeps/core/v1/search/counts?q=${encodeURIComponent(query)}`,
    { headers: apiHeaders(token) },
  );
  if (!response.ok()) return undefined;
  return response.json() as Promise<SearchCounts>;
};

export const assertExploreSearchTabs = async (page: Page) => {
  test.setTimeout(180_000);
  await page.goto('/feeds/local');
  const token = await readAuthToken(page);

  const words: Record<SearchNeedle, string> = {
    post: uniqueSearchWord('muffin'),
    event: uniqueSearchWord('coconut'),
    jam: uniqueSearchWord('jam'),
    group: uniqueSearchWord('grp'),
    member: uniqueSearchWord('mem'),
    dm: uniqueSearchWord('dm'),
  };

  const owner = await fetchCurrentProfile(page.request, token);
  await createNote(page.request, token, words.post);
  await createEvent(page.request, token, words.event);

  const start = new Date(Date.now() + 60_000).toISOString();
  const end = new Date(Date.now() + 3_600_000).toISOString();
  const jam = await page.request.post('/api/openpeeps/core/v1/posts', {
    headers: apiHeaders(token),
    data: {
      type: 'event',
      visibility: 'local',
      data: {
        type: 'event',
        name: words.jam,
        content: words.jam,
        start,
        end,
        wholeDay: false,
        jam: {
          type: 'video-call',
          videoEnabled: true,
          moderators: [owner.id],
          waitingRoom: false,
        },
      },
    },
  });
  expect(jam.ok(), await jam.text()).toBeTruthy();

  const groupHandle = uniqueHandle('g');
  await createGroup(page.request, token, {
    handle: groupHandle,
    displayName: words.group,
    capabilities: {
      local: { add: ['core-groups-read'] },
    },
  });

  const memberHandle = uniqueHandle('m');
  const member = await registerUser(page.request, {
    handle: memberHandle,
    displayName: words.member,
    email: `${memberHandle}@openpeeps.test`,
    password: 'testtest12',
  });
  const memberProfile = await fetchCurrentProfile(
    page.request,
    member.token,
  );

  const ownerPublic = await page.request.get(
    `/api/openpeeps/core/v1/profiles/${owner.id}`,
    { headers: apiHeaders(token) },
  );
  const memberPublic = await page.request.get(
    `/api/openpeeps/core/v1/profiles/${memberProfile.id}`,
    { headers: apiHeaders(token) },
  );
  expect(ownerPublic.ok() && memberPublic.ok()).toBeTruthy();

  const dm = await page.request.post('/api/openpeeps/core/v1/posts', {
    headers: apiHeaders(token),
    data: {
      type: 'note',
      visibility: 'direct',
      audience: [await ownerPublic.json(), await memberPublic.json()],
      data: { type: 'note', content: words.dm },
    },
  });
  expect(dm.ok(), await dm.text()).toBeTruthy();

  const needles = Object.keys(words) as SearchNeedle[];
  await expect
    .poll(
      async () => {
        const counts = await Promise.all(
          needles.map(async (needle) => ({
            needle,
            counts: await fetchSearchCounts(page, token, words[needle]),
          })),
        );
        return Object.fromEntries(
          counts.map((entry) => [entry.needle, entry.counts ?? null]),
        );
      },
      { timeout: 45_000, intervals: [500, 1000, 2000] },
    )
    .toEqual(countsForNeedle);

  for (const needle of needles) {
    await page.goto(`/explore?q=${encodeURIComponent(words[needle])}#members`);
    await expect(page.getByTestId(testIds.explore.searchInput)).toHaveValue(
      words[needle],
    );
    for (const tab of exploreTabs) {
      const shouldShow = tabsForNeedle[needle].includes(tab.id);
      const hidden = needles
        .filter((key) => !(key === needle && shouldShow))
        .map((key) => words[key]);
      await expectExploreTab(
        page,
        tab,
        countsForNeedle[needle][tab.countKey],
        shouldShow ? words[needle] : undefined,
        hidden,
      );
    }
  }
};

export const assertExploreFindsPost = async (page: Page) => {
  const content = `muffinsalt${handleSuffix()}`;
  await createPostViaUi(page, content);

  const token = await readAuthToken(page);

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
        return results.some((item) =>
          item.data.data.content?.includes(content),
        );
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
  await expect(
    page.getByTestId(testIds.settings.linkPublicProfile),
  ).toBeVisible();
  await expect(page.getByTestId(testIds.settings.linkAccount)).toBeVisible();
  await expect(
    page.getByTestId(testIds.settings.linkNotifications),
  ).toBeVisible();
  await expect(page.getByTestId(testIds.settings.linkTheme)).toBeVisible();

  await page.goto('/settings/public-profile');
  await expect(
    page.getByTestId(testIds.settings.displayNameInput),
  ).toBeVisible();
  await expect(page.getByTestId(testIds.settings.handleInput)).toBeVisible();
  await expect(page.getByTestId(testIds.settings.bioInput)).toBeVisible();

  await page.goto('/settings/account');
  await expect(
    page.getByTestId(testIds.settings.currentPasswordInput),
  ).toBeVisible();
  await expect(page.getByTestId(testIds.settings.emailInput)).toBeVisible();

  await page.goto('/settings/notifications');
  await expect(
    page.getByTestId(testIds.settings.notificationsPreferencesLink),
  ).toBeVisible();
  await expect(
    page.getByTestId(testIds.settings.pushDevicesLink),
  ).toBeVisible();
  await page.goto('/settings/notifications/preferences');
  await expect(page.getByTestId(testIds.settings.saveButton)).toBeVisible();
};

export const updateBioViaUi = async (page: Page, bio?: string) => {
  const newBio = bio ?? `New Bio ${uniqueSuffix()}`;

  await page.goto('/settings/public-profile');
  await page.getByTestId(testIds.settings.bioInput).fill(newBio);
  const saveResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/profiles/current') &&
      response.ok(),
  );
  await page.getByTestId(testIds.settings.saveButton).click();
  await saveResponse;
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
  await expect(
    page.getByTestId(testIds.admin.configurationHeading),
  ).toBeVisible();
};

/** Owner profile from global setup (`test@test.com` / `@test`). */
export const ownerProfileHandle = 'test';

export const assertProfilePage = async (
  page: Page,
  handle = ownerProfileHandle,
) => {
  await page.goto(`/@${handle}`);
  await expect(page.getByTestId(testIds.profile.headerTitle)).toHaveText(
    handle,
  );
};

export const assertProfileFollowersPage = async (
  page: Page,
  handle = ownerProfileHandle,
) => {
  await page.goto(`/@${handle}/followers`);
  await expect(
    page.getByTestId(testIds.profile.followersHeading),
  ).toContainText(handle);
};

export const assertProfileFollowingPage = async (
  page: Page,
  handle = ownerProfileHandle,
) => {
  await page.goto(`/@${handle}/following`);
  await expect(
    page.getByTestId(testIds.profile.followingHeading),
  ).toContainText(handle);
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
