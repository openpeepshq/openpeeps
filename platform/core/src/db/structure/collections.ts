import { CollectionInfo } from "@openpeeps/arango-querybuilder";

const allPeepCollections = {
  dataMigrationsCollection: {
    name: 'dataMigrations',
  },

  i18nCollection: {
    name: 'i18n',
  },

  configCollection: {
    name: 'configs',
  },

  accountsCollection: {
    name: 'accounts',
    indices: [
      {
        type: 'persistent',
        fields: ['email'],
        name: 'unique-emails',
        unique: true,
      },
    ],
  },
  profilesCollection: {
    name: 'profiles',
    indices: [
      {
        type: 'persistent',
        fields: ['handle', 'activityPub.domain'],
        name: 'unique-activityPub-identifiers',
        unique: true,
      },
      {
        type: 'inverted',
        fields: ['handle', 'bio', 'displayName', 'location.text', 'fields[*].value'],
        analyzer: 'text_en',
        name: 'search-profiles',
      }
    ],
  },
  followsCollection: {
    name: 'follows',
    edge: true,
    indices: [
      {
        type: 'persistent',
        fields: ['_to', '_from'],
        name: 'unique-follows',
        unique: true,
      },
    ],
  },
  requestsFollowCollection: {
    name: 'requestsFollow',
    edge: true,
  },
  controlsCollection: {
    name: 'controls',
    edge: true,
  },
  postsCollection: {
    name: 'posts',
    indices: [
      {
        type: 'inverted',
        fields: ['data.content', 'data.options[*].content', 'data.name', 'data.physicalLocation.text', 'data.url'],
        analyzer: 'text_en',
        name: 'search-posts',
      },
    ]
  },
  mentionsCollection: {
    name: 'mentions',
    edge: true,
  },
  audienceCollection: {
    name: 'audience',
    edge: true,
  },
  hashtagsCollection: {
    name: 'hashtags',
  },
  postHashtagsCollection: {
    name: 'postHashtags',
    edge: true,
  },
  reportsCollection: {
    name: 'reports',
  },
  createdReportCollection: {
    name: 'createdReport',
    edge: true,
  },
  isReportedProfileCollection: {
    name: 'isReportedProfile',
    edge: true,
  },
  isReportedObjectCollection: {
    name: 'isReportedObject',
    edge: true,
  },
  entriesCollection: {
    name: 'entries',
    edge: true,
    indices: [
      {
        type: 'inverted',
        fields: [{ name: 'data', includeAllFields: true }],
        analyzer: 'text_en',
        name: 'search-entries',
      },
    ],
  },
  reactionsCollection: {
    name: 'reactions',
    edge: true,
    indices: [
      {
        type: 'persistent',
        fields: ['_from', '_to'],
        name: 'unique-reactions',
        unique: true,
      },
    ],
  },
  repliesCollection: {
    name: 'replyTo',
    edge: true,
    indices: [
      {
        type: 'persistent',
        fields: ['_from', '_to'],
        name: 'unique-replies',
        unique: true,
      },
    ],
  },
  repostCollection: {
    name: 'repost',
    edge: true,
    indices: [
      {
        type: 'persistent',
        fields: ['_from', '_to'],
        name: 'unique-reposts',
        unique: true,
      },
    ],
  },
  mediaAttachmentsCollection: {
    name: 'mediaAttachments',
  },
  processingStatsCollection: {
    name: 'processingStats',
    indices: [
      {
        type: 'persistent',
        fields: ['filetype'],
        name: 'processing-stats-by-filetype',
      },
      {
        type: 'persistent',
        fields: ['filetype', 'filesize'],
        name: 'processing-stats-by-filetype-filesize',
      },
    ],
  },
  rolesCollection: {
    name: 'roles',
  },
  hasRoleCollection: {
    name: 'hasRole',
    edge: true,
  },
  notificationsCollection: {
    name: 'notifications',
  },
  pushSubscriptionsCollection: {
    name: 'pushSubscriptions',
  },
  accountToPushSubscriptionCollection: {
    name: 'accountToPushSubscription',
    edge: true,
  },
  jamEventsCollection: {
    name: 'jamEvents',
  },
  inviteLinksCollection: {
    name: 'inviteLinks',
    indices: [
      {
        type: 'persistent',
        fields: ['slug'],
        name: 'unique-invite-link-slugs',
        unique: true,
      },
    ],
  },
  inviteLinkCreatorsCollection: {
    name: 'inviteLinkCreators',
    edge: true,
  },
  inviteLinkRedeemersCollection: {
    name: 'inviteLinkRedeemers',
    edge: true,
  },
  groupsCollection: {
    name: 'groups',
    indices: [
      {
        type: 'persistent',
        fields: ['handle'],
        name: 'unique-group-handles',
        unique: true,
      },
      {
        type: 'inverted',
        fields: ['handle', 'displayName', 'description', 'rules'],
        analyzer: 'text_en',
        name: 'search-groups',
      },
    ],

  },
  postGroupsCollection: {
    name: 'postGroups',
    edge: true,
  },
  userGroupsCollection: {
    name: 'userGroups',
    edge: true,
  },
  hasSeenCollection: {
    name: 'hasSeen',
    edge: true,
  },
  hasReadCollection: {
    name: 'hasRead',
    edge: true,
  },
  bookmarksCollection: {
    name: 'bookmarks',
    edge: true,
  },
  postSeenCollection: {
    name: 'postSeen',
    edge: true,
  },
  profileSettingsCollection: {
    name: 'profileSettings',
  },
  jamRecordingsCollection: {
    name: 'jamRecordings',
    edge: true,
  },
};

export const collectionInfos: Record<keyof typeof allPeepCollections, CollectionInfo> = allPeepCollections as Record<keyof typeof allPeepCollections, CollectionInfo>;
