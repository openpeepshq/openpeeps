import { expect, test, type Page } from '@playwright/test';
import {
  addGroupMember,
  createGroup,
  currentProfile,
  getPublicProfile,
  loginUser,
  registerUser,
  uniqueHandle,
} from '../../../helpers/api';
import { testIds } from '../testIds';
import { credentialsStorageKey } from './fixtures';

const ownerLogin = {
  email: 'test@test.com',
  password: 'testtest',
};

const memberCapabilities = {
  add: [
    'core-groups-read',
    'core-posts-read',
    'core-posts-create-*',
    'core-posts-react',
    'core-posts-reply',
  ],
};

/** Every signed-in community member can find and read the group. */
const publicGroupCapabilities = {
  local: { add: ['core-groups-read', 'core-groups-join', 'core-posts-read'] },
  member: memberCapabilities,
  owner: { add: ['core-posts-*', 'core-groups-*'] },
};

/** Only members can see the group at all. */
const privateGroupCapabilities = {
  member: memberCapabilities,
  owner: { add: ['core-posts-*', 'core-groups-*'] },
};

const signIn = async (page: Page, token: string) => {
  await page.goto('/auth/login');
  await page.evaluate(
    ([key, authToken]) => {
      window.localStorage.setItem(key, JSON.stringify({ token: authToken }));
    },
    [credentialsStorageKey, token] as const,
  );
};

const expectGroups = async (
  page: Page,
  visible: string[],
  hidden: string[],
) => {
  for (const name of visible) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  for (const name of hidden) {
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  }
};

test.describe('group visibility', () => {
  test('profile and groups pages list public and private memberships', async ({
    page,
    request,
  }) => {
    const owner = await loginUser(
      request,
      ownerLogin.email,
      ownerLogin.password,
    );
    const handle = uniqueHandle('gv');
    const member = await registerUser(request, {
      handle,
      email: `${handle}@example.com`,
      password: 'ui-test-password',
    });
    const profile = await getPublicProfile(
      request,
      owner.token,
      (await currentProfile(request, member.token)).id,
    );

    const names = {
      joinedPublic: `Joined public ${uniqueHandle('jp')}`,
      joinedPrivate: `Joined private ${uniqueHandle('jq')}`,
      otherPublic: `Other public ${uniqueHandle('op')}`,
      otherPrivate: `Other private ${uniqueHandle('oq')}`,
    };
    const create = (displayName: string, capabilities: unknown) =>
      createGroup(request, owner.token, {
        handle: uniqueHandle('g'),
        displayName,
        capabilities,
      });
    const joinedPublic = await create(
      names.joinedPublic,
      publicGroupCapabilities,
    );
    const joinedPrivate = await create(
      names.joinedPrivate,
      privateGroupCapabilities,
    );
    await create(names.otherPublic, publicGroupCapabilities);
    await create(names.otherPrivate, privateGroupCapabilities);
    await addGroupMember(request, owner.token, joinedPublic.id, profile);
    await addGroupMember(request, owner.token, joinedPrivate.id, profile);

    await signIn(page, member.token);

    await page.goto(`/@${handle}`);
    await expect(page.getByTestId(testIds.profile.headerTitle)).toBeVisible();
    await page.getByRole('button', { name: 'Groups' }).click();
    await expectGroups(
      page,
      [names.joinedPublic, names.joinedPrivate],
      [names.otherPublic, names.otherPrivate],
    );

    const groupsLoaded = page.waitForResponse(
      (response) =>
        /\/groups\/?$/.test(new URL(response.url()).pathname) && response.ok(),
    );
    await page.goto('/groups');
    await groupsLoaded;
    await expectGroups(
      page,
      [names.joinedPublic, names.joinedPrivate],
      [names.otherPublic, names.otherPrivate],
    );

    await page.getByRole('button', { name: 'All groups' }).click();
    await expectGroups(
      page,
      [names.joinedPublic, names.joinedPrivate, names.otherPublic],
      [names.otherPrivate],
    );
  });
});
