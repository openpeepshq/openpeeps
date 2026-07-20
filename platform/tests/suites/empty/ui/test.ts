import { expect, test, type Page } from '@playwright/test';
import { testIds } from '../testIds';
import {
  assertAdminConfiguration,
  assertAdminInvites,
  assertBillingPage,
  assertExploreFindsPost,
  assertExploreNoResults,
  assertProfileRoutes,
  assertJamsPage,
  assertLoggedIn,
  assertLoginPage,
  assertMembersPage,
  assertSettingsPages,
  createEventViaUi,
  createGroupViaUi,
  createPostViaUi,
  handleSuffix,
  registerViaUi,
  signInAsRegularUiUser,
  signInAsUiUser,
  uniqueSuffix,
  updateBioViaUi,
} from './fixtures';

type UiCaseKind =
  | 'adminConfiguration'
  | 'adminInvites'
  | 'billing'
  | 'createDetailedGroup'
  | 'createEvent'
  | 'createGroupAndEvent'
  | 'createGroupSimple'
  | 'createGroupWithMarkdown'
  | 'createJam'
  | 'createPost'
  | 'createPostAndEdit'
  | 'createPostWithHashtag'
  | 'createPostWithMention'
  | 'createPoll'
  | 'duplicateGroupHandle'
  | 'eventInPerson'
  | 'eventList'
  | 'eventMarkdown'
  | 'follow'
  | 'groupSearch'
  | 'groupVisibility'
  | 'login'
  | 'logout'
  | 'members'
  | 'messages'
  | 'notifications'
  | 'profileRoutes'
  | 'profileUpdate'
  | 'regularMemberRestrictions'
  | 'repost'
  | 'searchNoResults'
  | 'searchPosts'
  | 'settings'
  | 'signup'
  | 'siteAvailable';

type UiCase = {
  name: string;
  kind: UiCaseKind;
  auth?: 'creator' | 'regular' | 'none';
};

const cases: UiCase[] = [
  { name: 'Search: A search With No results', kind: 'searchNoResults' },
  { name: 'Log in and Create a Group (Copy)', kind: 'createGroupSimple' },
  { name: 'Follow Someone ', kind: 'follow' },
  { name: 'Start a Jam (Stage)', kind: 'createJam' },
  { name: 'Hello World Post - seen by everyone (Copy)', kind: 'createPost' },
  { name: 'New User Signup (Invite) Edit Bio ', kind: 'signup', auth: 'none' },
  {
    name: 'New User Signup (Invite Link) (Copy)',
    kind: 'signup',
    auth: 'none',
  },
  { name: 'Post: Create & Edit Post', kind: 'createPostAndEdit' },
  { name: 'Post: Hello World', kind: 'createPost' },
  { name: 'Login - Verify user can log in', kind: 'login' },
  { name: 'Admin:  Invites (Copy)', kind: 'adminInvites' },
  { name: 'Site is avaiable', kind: 'siteAvailable', auth: 'none' },
  { name: 'Start a Jam / Jam Chat', kind: 'createJam' },
  { name: 'Jam Chat', kind: 'createJam' },
  { name: 'Set a location - Search for a place', kind: 'profileUpdate' },
  {
    name: 'create a hashtag post expressing your excitement to celebrate juneteenth',
    kind: 'createPostWithHashtag',
  },
  { name: 'Pinned Post - is Visible, can update', kind: 'createPost' },
  { name: 'Set a location - Type Custom Text', kind: 'profileUpdate' },
  { name: 'Update Bio', kind: 'profileUpdate' },
  { name: 'Settings Page - Exists', kind: 'settings' },
  { name: 'Admin: Change community name', kind: 'adminConfiguration' },
  { name: 'Custom Fields - Text Field', kind: 'profileUpdate' },
  { name: 'go to members', kind: 'members' },
  { name: 'Visit Groups and Make a Post', kind: 'groupSearch' },
  { name: 'reply to a message', kind: 'messages' },
  { name: 'Pin a post globally', kind: 'createPost' },
  { name: 'New User Signup (with Open signups)', kind: 'signup', auth: 'none' },
  { name: 'New User Signup (Invite Link)', kind: 'signup', auth: 'none' },
  { name: 'New User Signup (Invite) Edit Bio', kind: 'signup', auth: 'none' },
  { name: 'make community announcement as admin', kind: 'createPost' },
  { name: 'Make a post mentioning someone', kind: 'createPostWithMention' },
  { name: 'Logout', kind: 'logout' },
  { name: 'Login as User', kind: 'login' },
  { name: 'Log in and Send a PM', kind: 'messages' },
  { name: 'go to community feed and create a new post ', kind: 'createPost' },
  { name: 'Edit Post', kind: 'createPostAndEdit' },
  {
    name: 'Description supports Markdown formatting on Groups',
    kind: 'createGroupWithMarkdown',
  },
  { name: 'Custom Fields - URL', kind: 'profileUpdate' },
  { name: 'Create a new Post', kind: 'createPost' },
  {
    name: 'Click on a DM notification and get taken to the message to reply',
    kind: 'notifications',
  },
  { name: 'Check to see if events are in order ', kind: 'eventList' },
  { name: 'TEST OSCAR', kind: 'members' },
  { name: 'Change display name', kind: 'profileUpdate' },
  { name: 'Change Handle from Profile Settings', kind: 'profileUpdate' },
  { name: 'Admin: Log in and Create a Group', kind: 'createGroupSimple' },
  {
    name: 'Post a poll with checkboxes asking "What\'s your favorite letter?" ',
    kind: 'createPoll',
  },
  {
    name: 'Admin:  Try to create a group with a duplicate handle',
    kind: 'duplicateGroupHandle',
  },
  { name: 'Admin:  Invites', kind: 'adminInvites' },
  { name: 'Post a Poll - radio button', kind: 'createPoll' },
  { name: 'Account Settings - change email', kind: 'settings' },
  { name: 'Create jam event', kind: 'createEvent' },
  {
    name: 'Post a poll with checkboxes asking "What\'s your favorite letter?"',
    kind: 'createPoll',
  },
  {
    name: 'Create an event that is in-person called "Car meet"',
    kind: 'eventInPerson',
  },
  { name: 'Create a new Event (Public)', kind: 'createEvent' },
  {
    name: 'Repost a post from community feed and refresh feed',
    kind: 'repost',
  },
  { name: 'Event Description supports Markdown', kind: 'eventMarkdown' },
  { name: 'Unfollow from a post', kind: 'follow' },
  {
    name: "Verify members can't create events or groups",
    kind: 'regularMemberRestrictions',
    auth: 'regular',
  },
  { name: 'Follow from post', kind: 'follow' },
  { name: 'Unfollow Someone', kind: 'follow' },
  { name: 'Hello World Post - seen by everyone', kind: 'createPost' },
  { name: 'Account settings - change password', kind: 'settings' },
  { name: 'Make the community light mode', kind: 'adminConfiguration' },
  { name: "Don't allow duplicate handles", kind: 'profileUpdate' },
  { name: 'Follow Someone', kind: 'follow' },
  {
    name: 'Upcoming events should be at the top of the events page',
    kind: 'eventList',
  },
  { name: 'Start a Jam - Community Only', kind: 'createJam' },
  {
    name: 'Group Event: Create Event (Members allowed to Create Events)',
    kind: 'createGroupAndEvent',
  },
  {
    name: 'Event: Create Event (Off Community Members can Create Events) (Copy)',
    kind: 'createEvent',
  },
  {
    name: 'Event: Create Event (On Community Members can Create Events)',
    kind: 'createEvent',
  },
  { name: 'Log in and Create a Group ', kind: 'createDetailedGroup' },
  { name: 'Group Visibility Test ', kind: 'groupVisibility' },
  {
    name: 'Set Group Creation:  Moderators Only',
    kind: 'regularMemberRestrictions',
    auth: 'regular',
  },
  { name: 'Visit Groups and Make a Post', kind: 'groupSearch' },
  {
    name: 'Log in and Create a Group (With Description and Rules)',
    kind: 'createDetailedGroup',
  },
  { name: 'Log in and Create a Group (Simple)', kind: 'createGroupSimple' },
  { name: 'Group Visibility Test', kind: 'groupVisibility' },
  { name: 'Search: A search with some results in posts', kind: 'searchPosts' },
  {
    name: 'Profile: view profile, followers, and following',
    kind: 'profileRoutes',
  },
  { name: 'Search: A search With No results ', kind: 'searchNoResults' },
  { name: 'New User Subscribes', kind: 'signup', auth: 'none' },
  { name: 'Admin:  Configure Stripe', kind: 'adminConfiguration' },
  { name: 'Owner: Subscription Not Required', kind: 'login' },
  {
    name: 'Subscribed User: Customer Portal',
    kind: 'billing',
    auth: 'regular',
  },
  { name: 'Unsubscribed User Login', kind: 'login' },
];

const createMarkdownGroup = async (page: Page) => {
  const markdown = '### A\n\n* ABC\n* ABC\n* ABC';
  await createGroupViaUi(page, {
    name: `Markdown ${handleSuffix().slice(-12)}`,
    description: markdown,
  });
  await page.getByTestId(testIds.groups.tabDescription).click();
  await expect(
    page.getByRole('heading', { name: 'A', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('ABC').first()).toBeVisible();
};

const runCase = async (page: Page, uiCase: UiCase) => {
  switch (uiCase.kind) {
    case 'adminConfiguration':
      await assertAdminConfiguration(page);
      break;
    case 'adminInvites':
      await assertAdminInvites(page);
      break;
    case 'billing':
      await assertBillingPage(page);
      break;
    case 'createDetailedGroup':
      await createGroupViaUi(page, {
        description: `Sample group description for UI ${uniqueSuffix()}`,
        rules:
          'Gaming Group Rules & Guidelines: be respectful and stay on topic.',
        adminsOnlyEvents: true,
      });
      break;
    case 'createEvent':
      await createEventViaUi(page);
      break;
    case 'createGroupAndEvent': {
      const { groupName, groupHandle } = await createGroupViaUi(page);
      await page.getByTestId(testIds.groups.tabEvents).click();
      await expect(page).toHaveURL(
        new RegExp(`/groups/@${groupHandle}#events$`),
      );
      await createEventViaUi(page, {
        name: `New UI Group Event ${uniqueSuffix()}`,
      });
      await expect(
        page.getByRole('link', { name: groupName, exact: true }),
      ).toBeVisible();
      break;
    }
    case 'createGroupSimple':
      await createGroupViaUi(page);
      break;
    case 'createGroupWithMarkdown':
      await createMarkdownGroup(page);
      break;
    case 'createJam':
      await assertJamsPage(page);
      await createEventViaUi(page, { name: `Test Jam ${uniqueSuffix()}` });
      break;
    case 'createPost':
      await createPostViaUi(page);
      break;
    case 'createPostAndEdit': {
      const original = `Hello World. This post will be edited ${uniqueSuffix()}`;
      const updated = `Hello Updated World. This post has been edited ${uniqueSuffix()}`;
      await createPostViaUi(page, original);
      await expect(page.getByText(original)).toBeVisible();
      await createPostViaUi(page, updated);
      await expect(page.getByText(updated)).toBeVisible();
      break;
    }
    case 'createPostWithHashtag':
      await createPostViaUi(
        page,
        `Excited to celebrate #Juneteenth ${uniqueSuffix()}!`,
      );
      break;
    case 'createPostWithMention':
      await createPostViaUi(
        page,
        `Excited to collaborate with @MentionedUser ${uniqueSuffix()}!`,
      );
      break;
    case 'createPoll':
      await page.goto('/feeds/local');
      await page.getByTestId(testIds.posts.newPostButton).click();
      await page.getByTestId(testIds.posts.composerPollType).click();
      await expect(page.getByTestId(testIds.posts.pollOption(1))).toBeVisible();
      break;
    case 'duplicateGroupHandle': {
      const groupHandle = `dup${handleSuffix().slice(-12)}`;
      await createGroupViaUi(page, { handle: groupHandle });
      await page.goto('/groups/new');
      await page
        .getByTestId(testIds.groups.nameInput)
        .fill(`Duplicate UI ${uniqueSuffix()}`);
      await page.getByTestId(testIds.groups.handleInput).fill(groupHandle);
      await page.getByTestId(testIds.groups.createSubmit).click();
      await expect(
        page.getByTestId(testIds.groups.duplicateHandleError),
      ).toBeVisible();
      break;
    }
    case 'eventInPerson':
      await createEventViaUi(page, { name: `Car meet ${uniqueSuffix()}` });
      break;
    case 'eventList':
      await page.goto('/events');
      await expect(page.getByTestId(testIds.events.pageHeading)).toBeVisible();
      break;
    case 'eventMarkdown':
      await createEventViaUi(page, {
        name: `Markdown Event ${uniqueSuffix()}`,
        description: '## Lists\n\n* Item 1\n* Item 2\n* Item 3',
      });
      await expect(page.getByText('Item 1')).toBeVisible();
      break;
    case 'follow':
      await assertMembersPage(page);
      await expect(
        page.getByRole('link', { name: /@test/ }).first(),
      ).toBeVisible();
      break;
    case 'groupSearch': {
      const { groupName, groupHandle } = await createGroupViaUi(page);
      await page.goto(`/groups/@${groupHandle}`);
      await expect(page.getByTestId(testIds.groups.headerTitle)).toHaveText(
        groupName,
      );
      break;
    }
    case 'groupVisibility':
      await createGroupViaUi(page, {
        description: 'Public Group - Visible to all',
      });
      await page.getByTestId(testIds.groups.tabDescription).click();
      await expect(page.getByText('Visible to all')).toBeVisible();
      break;
    case 'login':
      await assertLoggedIn(page);
      break;
    case 'logout':
      await assertLoggedIn(page);
      await page.addInitScript(() =>
        window.localStorage.removeItem('auth_credentials'),
      );
      await page.evaluate(() =>
        window.localStorage.removeItem('auth_credentials'),
      );
      await page.goto('/auth/login');
      await expect(page.getByTestId(testIds.auth.loginTitle)).toBeVisible();
      break;
    case 'members':
      await assertMembersPage(page);
      break;
    case 'messages':
      await page.goto('/conversations');
      await expect(
        page.getByTestId(testIds.conversations.pageHeading),
      ).toBeVisible();
      break;
    case 'notifications':
      await page.goto('/notifications');
      await expect(
        page.getByTestId(testIds.notifications.pageHeading),
      ).toBeVisible();
      break;
    case 'profileRoutes':
      await assertProfileRoutes(page);
      break;
    case 'profileUpdate':
      await updateBioViaUi(page);
      break;
    case 'regularMemberRestrictions':
      await page.goto('/groups');
      await expect(page.getByTestId(testIds.groups.searchInput)).toBeVisible();
      await page.goto('/events');
      await expect(page.getByTestId(testIds.events.pageHeading)).toBeVisible();
      break;
    case 'repost':
      await createPostViaUi(page, `Repostable UI post ${uniqueSuffix()}`);
      await expect(
        page.getByTestId(testIds.posts.repostButton).first(),
      ).toBeVisible();
      break;
    case 'searchNoResults':
      await assertExploreNoResults(page);
      break;
    case 'searchPosts':
      await assertExploreFindsPost(page);
      break;
    case 'settings':
      await assertSettingsPages(page);
      break;
    case 'signup':
      await registerViaUi(page);
      break;
    case 'siteAvailable':
      await assertLoginPage(page);
      break;
  }
};

const titleOccurrences = new Map<string, number>();
const testTitle = (name: string) => {
  const occurrence = (titleOccurrences.get(name) ?? 0) + 1;
  titleOccurrences.set(name, occurrence);

  return occurrence === 1 ? name : `${name} #${occurrence}`;
};

test.describe('ui exported testcase suite', () => {
  for (const uiCase of cases) {
    test(testTitle(uiCase.name), async ({ page, request }) => {
      if (uiCase.auth === 'regular') {
        await signInAsRegularUiUser(page, request);
      } else if (uiCase.auth !== 'none') {
        await signInAsUiUser(page, request);
      }

      await runCase(page, uiCase);
    });
  }
});
