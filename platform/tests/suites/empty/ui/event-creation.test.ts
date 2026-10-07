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
  currentProfile,
  getAdminConfig,
  loginUser,
  patchAdminConfig,
  registerUser,
  uniqueHandle,
} from '../../../helpers/api';
import { testIds } from '../testIds';
import { credentialsStorageKey } from './fixtures';

const ownerLogin = {
  email: 'test@test.com',
  password: 'testtest',
};

const memberPassword = 'ui-test-password';

const eventCapability = 'core-posts-create-*';
const noteCapabilities = [
  'core-posts-create-note-*',
  'core-posts-create-question-*',
  'core-posts-create-article-*',
];

const publicVisibility = /Everyone on the internet can join/;
const communityVisibility = /Everyone in the community can join/;
const groupVisibility = /Only people in the selected group can see and join/;
const directVisibility = /Only individuals you invite can see this event/;

type RoleRecord = {
  id: string;
  key: string;
  default: boolean;
  displayName: string;
  description?: string;
  capabilities?: { add?: string[]; remove?: string[] };
};

type CreatedEvent = {
  id: string;
  visibility: string;
  data: { jam?: unknown; name?: string };
};

type Member = {
  id: string;
  token: string;
  handle: string;
};

const groupCapabilities = (membersCanCreateEvents: boolean) => ({
  local: {
    add: [
      'core-groups-read',
      'core-posts-read',
      'core-groups-join',
      'core-posts-react',
      'core-posts-reply',
      'core-posts-rsvp',
      'core-posts-vote',
    ],
  },
  member: {
    add: [
      'core-groups-read',
      'core-posts-read',
      'core-groups-join',
      'core-posts-create-*',
      'core-posts-react',
      'core-posts-reply',
      'core-posts-rsvp',
      'core-posts-vote',
    ],
    ...(membersCanCreateEvents ? {} : { remove: ['core-posts-create-event'] }),
  },
  admin: {
    add: [
      'core-posts-*',
      'core-groups-read',
      'core-groups-update',
      'core-groups-join',
      'core-groups-leave',
      'core-groups-addMember',
      'core-groups-removeMember',
      'core-groups-changeMemberRole',
    ],
  },
  owner: { add: ['core-posts-*', 'core-groups-*'] },
});

const toDateTimeLocal = (date: Date) => {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
};

const listRoles = async (request: APIRequestContext, token: string) => {
  const response = await request.get('/api/openpeeps/core/v1/admin/roles', {
    headers: apiHeaders(token),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json() as Promise<RoleRecord[]>;
};

const memberRole = async (request: APIRequestContext, token: string) => {
  const roles = await listRoles(request, token);
  const role = roles.find((entry) => entry.key === 'member');
  expect(role, 'member role exists').toBeTruthy();
  return role as RoleRecord;
};

const saveRole = async (
  request: APIRequestContext,
  token: string,
  role: RoleRecord,
) => {
  const response = await request.put(
    `/api/openpeeps/core/v1/admin/roles/${role.id}`,
    {
      headers: apiHeaders(token),
      data: {
        key: role.key,
        default: role.default,
        displayName: role.displayName,
        description: role.description,
        capabilities: {
          add: role.capabilities?.add ?? [],
          remove: role.capabilities?.remove ?? [],
        },
      },
    },
  );
  expect(response.ok(), await response.text()).toBeTruthy();
};

/** Mirrors the admin "Members can create events" toggle. */
const withMemberEventCreation = (
  role: RoleRecord,
  enabled: boolean,
): RoleRecord => {
  const current = role.capabilities?.add ?? [];
  const add = enabled
    ? [
        ...current.filter((cap) => !noteCapabilities.includes(cap)),
        ...(current.includes(eventCapability) ? [] : [eventCapability]),
      ]
    : [
        ...current.filter((cap) => cap !== eventCapability),
        ...noteCapabilities.filter((cap) => !current.includes(cap)),
      ];

  return {
    ...role,
    capabilities: {
      add,
      remove: role.capabilities?.remove ?? [],
    },
  };
};

const createMember = async (
  request: APIRequestContext,
  ownerToken: string,
  prefix: string,
): Promise<Member> => {
  const handle = uniqueHandle(prefix);
  const registered = await registerUser(request, {
    handle,
    email: `${handle}@example.com`,
    password: memberPassword,
    displayName: handle,
  });
  const profile = await currentProfile(request, registered.token);
  const role = await memberRole(request, ownerToken);
  const assigned = await request.put(
    `/api/openpeeps/core/v1/admin/profiles/${profile.id}/roles`,
    {
      headers: apiHeaders(ownerToken),
      data: { roles: [role] },
    },
  );
  expect(assigned.ok(), await assigned.text()).toBeTruthy();
  return { id: profile.id, token: registered.token, handle };
};

const joinGroup = async (
  request: APIRequestContext,
  token: string,
  groupId: string,
) => {
  const response = await request.post(
    `/api/openpeeps/core/v1/groups/${groupId}/join`,
    { headers: apiHeaders(token), data: {} },
  );
  expect(response.ok(), await response.text()).toBeTruthy();
};

const signIn = async (page: Page, token: string) => {
  await page.goto('/auth/login');
  await page.evaluate(
    ([key, authToken]) => {
      window.localStorage.setItem(key, JSON.stringify({ token: authToken }));
    },
    [credentialsStorageKey, token] as const,
  );
  await page.goto('/feeds/local');
  await expect(page.getByTestId(testIds.feeds.communityHeading)).toBeVisible();
};

const signOut = async (page: Page) => {
  await page.goto('/auth/login');
  await page.evaluate(
    (key) => window.localStorage.removeItem(key),
    credentialsStorageKey,
  );
};

/** Toggles `server.publicContent` so visitors may browse without signing in. */
const withPublicContent = async (
  request: APIRequestContext,
  ownerToken: string,
  run: () => Promise<void>,
) => {
  const { config } = await getAdminConfig(
    request,
    ownerToken,
    'openpeeps',
    'core',
  );
  try {
    await patchAdminConfig(request, ownerToken, 'openpeeps', 'core', {
      ...config,
      server: { ...config.server, publicContent: true },
    });
    await run();
  } finally {
    await patchAdminConfig(request, ownerToken, 'openpeeps', 'core', config);
  }
};

const openFreshEventForm = async (page: Page) => {
  // The composer keeps the last draft, including a group audience.
  await page.evaluate(() => window.localStorage.removeItem('new-event-state'));
  await page.goto('/events/new');
  await expect(page.getByTestId(testIds.events.formBasicDetails)).toBeVisible();
};

const fillJamEventDetails = async (page: Page, name: string) => {
  await page.getByTestId(testIds.events.nameInput).fill(name);
  await page
    .getByTestId(testIds.events.descriptionInput)
    .fill(`Jam session ${name}`);

  const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
  start.setSeconds(0, 0);
  await page
    .getByTestId(testIds.events.startInput)
    .fill(toDateTimeLocal(start));

  const endToggle = page.getByRole('checkbox', {
    name: /Add end date and time/i,
  });
  await endToggle.check();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  await page.locator('#event-end').fill(toDateTimeLocal(end));

  const jam = page.getByRole('radio', { name: /jam/i });
  if ((await jam.count()) > 0 && (await jam.isEnabled())) {
    await jam.check();
  }
};

const audienceDialog = (page: Page) =>
  page.getByRole('dialog').filter({ hasText: 'Who can see this?' });

const openAudience = async (page: Page) => {
  await page.getByTitle('Change audience').click();
  const dialog = audienceDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
};

const confirmAudience = async (page: Page) => {
  const dialog = audienceDialog(page);
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();
};

const closeAudience = async (page: Page) => {
  const dialog = audienceDialog(page);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
};

const publishEvent = async (page: Page) => {
  const submit = page.getByTestId(testIds.events.createSubmit);
  await expect(submit).toBeEnabled();
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/posts\/?$/.test(new URL(response.url()).pathname),
  );
  await submit.click();
  const response = await responsePromise;
  const body = await response.text();
  expect(
    response.ok(),
    `create event failed: ${response.status()} ${body}`,
  ).toBe(true);
  const created = JSON.parse(body) as CreatedEvent;
  expect(created.data.name).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/posts/${created.id}$`));
  await expect(
    page.getByRole('heading', { name: created.data.name }),
  ).toBeVisible();
  return created;
};

/** Create stays disabled, or the API rejects a community-scoped event. */
const assertCommunityCreateBlocked = async (page: Page) => {
  const submit = page.getByTestId(testIds.events.createSubmit);
  if (!(await submit.isEnabled())) {
    await expect(submit).toBeDisabled();
    return;
  }

  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/posts\/?$/.test(new URL(response.url()).pathname),
  );
  await submit.click();
  const response = await responsePromise;
  expect(response.ok(), 'community event create should be rejected').toBe(
    false,
  );
  await expect(page).toHaveURL(/\/events\/new/);
};

const expectEventListed = async (page: Page, path: string, name: string) => {
  await page.goto(path);
  if (path === '/events') {
    await expect(page.getByTestId(testIds.events.pageHeading)).toBeVisible();
  }
  if (path === '/conversations') {
    await expect(
      page.getByTestId(testIds.conversations.pageHeading),
    ).toBeVisible();
  }
  await expect(page.getByText(name).first()).toBeVisible();
};

/** Waits for the feed request behind `path` before asserting `name` is absent. */
const expectEventMissing = async (
  page: Page,
  path: string,
  feedPath: string,
  name: string,
) => {
  const loaded = page.waitForResponse(
    (response) => response.url().includes(feedPath) && response.ok(),
  );
  await page.goto(path);
  await loaded;
  await expect(page.getByText(name)).toHaveCount(0);
};

const expectEventPage = async (page: Page, event: CreatedEvent) => {
  await page.goto(`/posts/${event.id}`);
  await expect(
    page.getByRole('heading', { name: event.data.name }),
  ).toBeVisible();
};

test.describe('creating events', () => {
  test('a public event is visible to visitors who are not signed in', async ({
    page,
    request,
  }) => {
    const owner = await loginUser(
      request,
      ownerLogin.email,
      ownerLogin.password,
    );
    const previous = await memberRole(request, owner.token);

    try {
      await saveRole(
        request,
        owner.token,
        withMemberEventCreation(previous, true),
      );
      await withPublicContent(request, owner.token, async () => {
        const host = await createMember(request, owner.token, 'pu');
        const eventName = `Public jam ${uniqueHandle('pe')}`;
        const communityName = `Community only ${uniqueHandle('co')}`;
        await createEvent(request, host.token, communityName);

        await signIn(page, host.token);
        await openFreshEventForm(page);
        await fillJamEventDetails(page, eventName);
        const dialog = await openAudience(page);
        await dialog.getByRole('button', { name: publicVisibility }).click();
        await confirmAudience(page);

        const created = await publishEvent(page);
        expect(created.visibility).toBe('public');

        await signOut(page);
        await expectEventPage(page, created);
        await expectEventListed(page, '/events', eventName);
        await expect(page.getByText(communityName)).toHaveCount(0);
      });
    } finally {
      await saveRole(request, owner.token, previous);
    }
  });

  test('community members can publish a jam event to the community feed', async ({
    page,
    request,
  }) => {
    const owner = await loginUser(
      request,
      ownerLogin.email,
      ownerLogin.password,
    );
    const previous = await memberRole(request, owner.token);

    try {
      await saveRole(
        request,
        owner.token,
        withMemberEventCreation(previous, true),
      );
      const creator = await createMember(request, owner.token, 'ec');
      const viewer = await createMember(request, owner.token, 'ev');
      const eventName = `Community jam ${uniqueHandle('cj')}`;

      await signIn(page, creator.token);
      await openFreshEventForm(page);
      await fillJamEventDetails(page, eventName);
      const dialog = await openAudience(page);
      await dialog.getByRole('button', { name: communityVisibility }).click();
      await confirmAudience(page);

      const created = await publishEvent(page);
      expect(created.visibility).toBe('local');
      expect(created.data.jam).toBeTruthy();

      await signIn(page, viewer.token);
      await expectEventListed(page, '/feeds/local', eventName);
      await expectEventListed(page, '/events', eventName);
    } finally {
      await saveRole(request, owner.token, previous);
    }
  });

  test('members cannot publish an event to everyone when creation is off', async ({
    page,
    request,
  }) => {
    const owner = await loginUser(
      request,
      ownerLogin.email,
      ownerLogin.password,
    );
    const previous = await memberRole(request, owner.token);

    try {
      await saveRole(
        request,
        owner.token,
        withMemberEventCreation(previous, false),
      );
      const member = await createMember(request, owner.token, 'ex');
      const groupName = `Open ${uniqueHandle('og')}`;
      const group = await createGroup(request, owner.token, {
        handle: uniqueHandle('og'),
        displayName: groupName,
        capabilities: groupCapabilities(true),
      });
      await joinGroup(request, member.token, group.id);

      await signIn(page, member.token);
      await page.goto(`/groups/@${group.handle}`);
      await page.getByTestId(testIds.groups.tabEvents).click();
      await page.getByTestId(testIds.events.newEventButton).click();
      await expect(page).toHaveURL(/\/events\/new/);
      await fillJamEventDetails(page, `Blocked group ${uniqueHandle('bg')}`);
      const groupDialog = await openAudience(page);
      const communityFromGroup = groupDialog.getByRole('button', {
        name: communityVisibility,
      });
      if (await communityFromGroup.isVisible()) {
        await communityFromGroup.click();
        await confirmAudience(page);
        await assertCommunityCreateBlocked(page);
      } else {
        await expect(communityFromGroup).toHaveCount(0);
        await closeAudience(page);
      }

      await openFreshEventForm(page);
      await fillJamEventDetails(page, `Blocked feed ${uniqueHandle('bf')}`);
      const feedDialog = await openAudience(page);
      const community = feedDialog.getByRole('button', {
        name: communityVisibility,
      });
      if (await community.isVisible()) {
        await community.click();
        await confirmAudience(page);
      } else {
        await closeAudience(page);
      }
      await assertCommunityCreateBlocked(page);
    } finally {
      await saveRole(request, owner.token, previous);
    }
  });

  test('a group jam event shows on the group calendar and in members’ my feed', async ({
    page,
    request,
  }) => {
    const owner = await loginUser(
      request,
      ownerLogin.email,
      ownerLogin.password,
    );
    const member = await createMember(request, owner.token, 'gm');
    const fellowMember = await createMember(request, owner.token, 'gf');
    const outsider = await createMember(request, owner.token, 'go');
    const groupName = `Calendar ${uniqueHandle('cal')}`;
    const group = await createGroup(request, owner.token, {
      handle: uniqueHandle('cal'),
      displayName: groupName,
      capabilities: groupCapabilities(true),
    });
    await joinGroup(request, member.token, group.id);
    await joinGroup(request, fellowMember.token, group.id);
    const eventName = `Group jam ${uniqueHandle('gj')}`;

    await signIn(page, member.token);
    await page.goto(`/groups/@${group.handle}`);
    await page.getByTestId(testIds.groups.tabEvents).click();
    await page.getByTestId(testIds.events.newEventButton).click();
    await expect(page).toHaveURL(/\/events\/new/);
    await fillJamEventDetails(page, eventName);

    const created = await publishEvent(page);
    expect(created.visibility).toBe('group');
    expect(created.data.jam).toBeTruthy();

    await page.goto(`/groups/@${group.handle}`);
    await page.getByTestId(testIds.groups.tabEvents).click();
    await expect(page.getByText(eventName).first()).toBeVisible();

    await signIn(page, fellowMember.token);
    await expectEventListed(page, '/feeds/my', eventName);

    await signIn(page, outsider.token);
    await expectEventMissing(page, '/feeds/my', '/posts/feeds/my', eventName);
  });

  test('admins-only groups hide event creation from regular members', async ({
    page,
    request,
  }) => {
    const owner = await loginUser(
      request,
      ownerLogin.email,
      ownerLogin.password,
    );
    const member = await createMember(request, owner.token, 'ga');
    const openName = `Members ${uniqueHandle('me')}`;
    const closedName = `Admins ${uniqueHandle('ad')}`;
    const openGroup = await createGroup(request, owner.token, {
      handle: uniqueHandle('me'),
      displayName: openName,
      capabilities: groupCapabilities(true),
    });
    const closedGroup = await createGroup(request, owner.token, {
      handle: uniqueHandle('ad'),
      displayName: closedName,
      capabilities: groupCapabilities(false),
    });
    await joinGroup(request, member.token, openGroup.id);
    await joinGroup(request, member.token, closedGroup.id);

    await signIn(page, member.token);
    await page.goto(`/groups/@${closedGroup.handle}`);
    await page.getByTestId(testIds.groups.tabEvents).click();
    await expect(page.getByTestId(testIds.events.newEventButton)).toHaveCount(
      0,
    );
    await expect(page.getByRole('button', { name: 'New event' })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('button', { name: 'Basic Details' }),
    ).toHaveCount(0);

    await openFreshEventForm(page);
    const dialog = await openAudience(page);
    await dialog.getByRole('button', { name: groupVisibility }).click();
    await expect(dialog.getByRole('button', { name: closedName })).toHaveCount(
      0,
    );
    await expect(dialog.getByRole('button', { name: openName })).toBeVisible();
  });

  test('a private jam event is limited to the invited members', async ({
    page,
    request,
  }) => {
    const owner = await loginUser(
      request,
      ownerLogin.email,
      ownerLogin.password,
    );
    const previous = await memberRole(request, owner.token);

    try {
      await saveRole(
        request,
        owner.token,
        withMemberEventCreation(previous, true),
      );
      const host = await createMember(request, owner.token, 'ph');
      const invited = await createMember(request, owner.token, 'pi');
      const alsoInvited = await createMember(request, owner.token, 'pj');
      const outsider = await createMember(request, owner.token, 'po');
      const eventName = `Private jam ${uniqueHandle('pj')}`;

      await signIn(page, host.token);
      await openFreshEventForm(page);
      await fillJamEventDetails(page, eventName);
      const dialog = await openAudience(page);
      await dialog.getByRole('button', { name: directVisibility }).click();
      const picker = page.getByRole('dialog').filter({
        has: page.getByPlaceholder('Search profiles…'),
      });
      for (const handle of [invited.handle, alsoInvited.handle]) {
        await picker.getByPlaceholder('Search profiles…').fill(handle);
        await picker
          .getByRole('button', { name: new RegExp(`@${handle}\\b`) })
          .click();
      }
      await picker.getByRole('button', { name: 'OK' }).click();
      await expect(picker).toBeHidden();
      await confirmAudience(page);

      const created = await publishEvent(page);
      expect(created.visibility).toBe('direct');
      expect(created.data.jam).toBeTruthy();

      await signIn(page, invited.token);
      await expectEventPage(page, created);
      await expectEventListed(page, '/events', eventName);
      await expectEventListed(page, '/conversations', eventName);

      await signIn(page, outsider.token);
      await expectEventMissing(
        page,
        '/events',
        '/posts/feeds/events/upcoming',
        eventName,
      );
      await expectEventMissing(
        page,
        '/feeds/local',
        '/posts/feeds/local',
        eventName,
      );

      await page.goto(`/posts/${created.id}`);
      await expect(
        page.getByText(/Post not found|do not have access/i),
      ).toBeVisible();
      await expect(page.getByText(eventName)).toHaveCount(0);
    } finally {
      await saveRole(request, owner.token, previous);
    }
  });
});
