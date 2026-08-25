import type {
  CapabilitiesConfig,
  GroupWithMeta,
  PublicNotification,
  PublicPost,
  PublicProfile,
  ProfileWithMeta,
  ServerInfo,
} from '@openpeepshq/common/types';
import {
  accessTokenRelationships,
  capabilitiesConfigSchema,
  postRelationships,
  profileRelationships,
  reportRelationships,
} from '@openpeepshq/common/types';

const now = '2026-08-11T12:00:00.000Z';
const earlier = '2026-08-10T09:30:00.000Z';

export const fixtureProfile: PublicProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'local',
  createdAt: earlier,
  updatedAt: now,
  handle: 'alex',
  displayName: 'Alex Rivera',
  bio: 'Community organizer and coffee enthusiast. Building better towns one conversation at a time.',
  avatar: null,
  header: null,
  discoverable: true,
  memberships: [],
  profileStats: {
    followersCount: 128,
    followingCount: 64,
  },
};

export const fixtureNeighbor: PublicProfile = {
  id: '22222222-2222-4222-8222-222222222222',
  type: 'local',
  createdAt: earlier,
  updatedAt: now,
  handle: 'sam',
  displayName: 'Sam Okonkwo',
  bio: 'Design systems, hiking, and weekend markets.',
  avatar: null,
  header: null,
  discoverable: true,
  memberships: [],
  profileStats: {
    followersCount: 89,
    followingCount: 110,
  },
};

export const fixtureMe = {
  ...fixtureProfile,
  roles: [],
  followers: [],
  following: [],
  controllers: [],
  memberships: [],
  profileStats: fixtureProfile.profileStats!,
} as ProfileWithMeta;

export const fixtureGroup = {
  id: '33333333-3333-4333-8333-333333333333',
  createdAt: earlier,
  updatedAt: now,
  handle: 'neighborhood',
  displayName: 'Neighborhood Watch',
  description: 'Local updates, events, and mutual aid for our block.',
  membersCount: 48,
  lastPostAt: now,
  discoverable: true,
} as GroupWithMeta;

const basePost = {
  entries: [],
  reactions: [],
  reposts: [],
  mentions: [],
  tags: [],
  rsvps: [],
  repostCount: 0,
  replyCount: 0,
  visibility: 'public' as const,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

export const fixtureNotePost = {
  ...basePost,
  id: '44444444-4444-4444-8444-444444444444',
  type: 'note',
  profile: fixtureProfile,
  replyCount: 3,
  repostCount: 1,
  data: {
    type: 'note',
    content:
      'Morning market is packed today — stop by the **community table** for fresh bread and flyers about Saturday cleanup.',
    attachments: [],
  },
} as PublicPost;

export const fixturePollPost = {
  ...basePost,
  id: '55555555-5555-4555-8555-555555555555',
  type: 'question',
  profile: fixtureNeighbor,
  data: {
    type: 'question',
    content: 'Where should we host the next block meetup?',
    options: [
      { type: 'note', content: 'Community garden' },
      { type: 'note', content: 'Library room' },
      { type: 'note', content: 'Online only' },
    ],
    multiple: false,
    expiresAt: '2026-08-20T18:00:00.000Z',
  },
} as PublicPost;

export const fixtureArticlePost = {
  ...basePost,
  id: '66666666-6666-4666-8666-666666666666',
  type: 'article',
  profile: fixtureProfile,
  data: {
    type: 'article',
    title: 'Why shared toolsheds work',
    content:
      'A shared toolshed cuts cost and builds trust. Here is how our block set one up in a weekend.\n\n## Start small\n\nBegin with a lockable cabinet and a simple checkout sheet.',
    attachments: [],
  },
} as PublicPost;

export const fixtureEventPost = {
  ...basePost,
  id: '77777777-7777-4777-8777-777777777777',
  type: 'event',
  profile: fixtureNeighbor,
  rsvps: [
    {
      response: 'yes',
      profile: fixtureProfile,
      createdAt: now,
    },
  ],
  data: {
    type: 'event',
    name: 'Saturday street cleanup',
    content: 'Bring gloves and a refillable bottle. Coffee afterward.',
    start: '2026-08-16T09:00:00.000Z',
    end: '2026-08-16T12:00:00.000Z',
    timeZone: 'Europe/Vienna',
    wholeDay: false,
    physicalLocation: {
      text: 'River Park entrance',
      name: 'River Park entrance',
    },
    attachments: [],
  },
} as unknown as PublicPost;

export const fixtureFollowNotification = {
  id: '99999999-9999-4999-8999-999999999999',
  type: 'follow',
  seen: false,
  read: false,
  createdAt: earlier,
  senderProfile: fixtureNeighbor,
} as PublicNotification;

export const fixtureAnnouncementNotification = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  type: 'announcement',
  seen: true,
  read: true,
  createdAt: now,
  senderProfile: fixtureProfile,
  data: { message: 'Welcome to the component gallery fixtures.' },
} as PublicNotification;

export const fixtureServerInfo: ServerInfo = {
  version: 'gallery',
  environment: 'gallery',
  publicContent: true,
  lastAccessed: null,
  communityConfig: {
    theme: {
      base: 'OpenpeepsLight',
      light: { primaryHex: '#4f46e5' },
      dark: { primaryHex: '#818cf8' },
    },
    info: {
      name: 'OpenPeeps Gallery',
      tagLine: 'Fixture-driven component gallery',
    },
    content: {},
    settings: { openRegistrations: true, defaultLanguage: 'en' },
    roles: {
      onRegistration: { add: [], remove: [] },
      onEmailValidation: { add: [], remove: [] },
    },
  },
  jams: { livekit: { url: '', enabled: false, recordingEnabled: false } },
  vapid: {},
  sentryConfig: { enabled: false },
  payments: { stripe: { paidMembership: { enabled: false } } },
};

// Grant everything so capability-gated affordances are visible in the gallery.
const allCapabilities = (relationships: readonly string[]) =>
  Object.fromEntries(
    relationships.map((relationship) => [
      relationship,
      { add: ['*'], remove: [] },
    ]),
  );

export const fixtureCapabilities: CapabilitiesConfig =
  capabilitiesConfigSchema.parse({
    post: allCapabilities(postRelationships),
    profile: allCapabilities(profileRelationships),
    report: allCapabilities(reportRelationships),
    accessToken: allCapabilities(accessTokenRelationships),
  });
