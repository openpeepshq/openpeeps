import type { CollectionInfo } from './map/queryTypes';
import { documentRegistry, edgeRegistry } from './map/registry';

const document = (name: keyof typeof documentRegistry): CollectionInfo => ({
  name,
});

const edge = (name: keyof typeof edgeRegistry): CollectionInfo => ({
  name,
  edge: true,
});

/** Named collection/edge refs aligned with `documentRegistry` and `edgeRegistry`. */
export const collectionInfos = {
  dataMigrationsCollection: document('dataMigrations'),
  i18nCollection: document('i18n'),
  configCollection: document('configs'),
  accountsCollection: document('accounts'),
  profilesCollection: document('profiles'),
  followsCollection: edge('follows'),
  requestsFollowCollection: edge('requestsFollow'),
  controlsCollection: edge('controls'),
  postsCollection: document('posts'),
  mentionsCollection: edge('mentions'),
  audienceCollection: edge('audience'),
  hashtagsCollection: document('hashtags'),
  postHashtagsCollection: edge('postHashtags'),
  reportsCollection: document('reports'),
  createdReportCollection: edge('createdReport'),
  isReportedProfileCollection: edge('isReportedProfile'),
  isReportedObjectCollection: edge('isReportedObject'),
  entriesCollection: edge('entries'),
  reactionsCollection: edge('reactions'),
  repliesCollection: edge('replyTo'),
  repostCollection: edge('repost'),
  mediaAttachmentsCollection: document('mediaAttachments'),
  processingStatsCollection: document('processingStats'),
  rolesCollection: document('roles'),
  accessTokensCollection: document('accessTokens'),
  profileAccessTokensCollection: edge('profileAccessTokens'),
  hasRoleCollection: edge('hasRole'),
  notificationsCollection: document('notifications'),
  pushSubscriptionsCollection: document('pushSubscriptions'),
  accountToPushSubscriptionCollection: edge('accountToPushSubscription'),
  jamEventsCollection: document('jamEvents'),
  inviteLinksCollection: document('inviteLinks'),
  inviteLinkCreatorsCollection: edge('inviteLinkCreators'),
  inviteLinkRedeemersCollection: edge('inviteLinkRedeemers'),
  groupsCollection: document('groups'),
  postGroupsCollection: edge('postGroups'),
  userGroupsCollection: edge('userGroups'),
  hasSeenCollection: edge('hasSeen'),
  hasReadCollection: edge('hasRead'),
  bookmarksCollection: edge('bookmarks'),
  postSeenCollection: edge('postSeen'),
  profileSettingsCollection: document('profileSettings'),
  jamRecordingsCollection: edge('jamRecordings'),
} as const satisfies Record<string, CollectionInfo>;

export type CollectionInfoKey = keyof typeof collectionInfos;
