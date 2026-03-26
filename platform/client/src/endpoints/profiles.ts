import type { FetchClient } from '@openpeeps/fetch-client';
import type {
  FollowData,
  GroupWithMeta,
  ChronologicalInfiniteQueryParams,
  PublicPost,
  NotificationStats,
  ProfileData,
  ProfileWithMeta,
  PublicProfile,
  SuccessFailureResponse,
  SuccessResponse,
  NotificationType,
  PublicNotification,
  ProfileSettings,
  ProfileSettingsData,
} from '@openpeeps/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

export const profiles = (rawClient: FetchClient) => ({
  current: {
    read: allpeepNoPayloadEndpoint<ProfileWithMeta>(
      rawClient,
      '/profiles/current',
    ),
    update: allpeepPayloadEndpoint<SuccessFailureResponse, ProfileData>(
      rawClient,
      '/profiles/current',
      'patch',
    ),
    notifications: allpeepNoPayloadEndpoint<
      PublicNotification[],
      undefined,
      ChronologicalInfiniteQueryParams
    >(rawClient, '/profiles/current/notifications'),
    notificationStats: allpeepNoPayloadEndpoint<NotificationStats>(
      rawClient,
      '/profiles/current/notifications/stats',
    ),
    notificationTypes: allpeepNoPayloadEndpoint<NotificationType[]>(
      rawClient,
      '/profiles/current/notifications/types',
    ),
    reposts: allpeepNoPayloadEndpoint<PublicPost[]>(
      rawClient,
      '/profiles/current/reposts',
    ),
    bookmarkedIds: allpeepNoPayloadEndpoint<string[]>(
      rawClient,
      '/profiles/current/bookmarkedIds',
    ),
    markAllNotificationsAsSeen: allpeepNoPayloadEndpoint<SuccessResponse>(
      rawClient,
      '/profiles/current/notifications/mark-all-seen',
      'put',
    ),
    readSettings: allpeepNoPayloadEndpoint<ProfileSettings>(
      rawClient,
      '/profiles/current/settings',
    ),
    updateSettings: allpeepPayloadEndpoint<ProfileSettings, ProfileSettingsData>(
      rawClient,
      '/profiles/current/settings',
      'put',
    ),
  },

  list: allpeepNoPayloadEndpoint<PublicProfile[]>(
    rawClient,
    '/profiles',
  ),
  findById: allpeepNoPayloadEndpoint<
    PublicProfile,
    { id: string }
  >(rawClient, '/profiles/:id'),
  findByHandle: allpeepNoPayloadEndpoint<
    PublicProfile,
    { handle: string }
  >(rawClient, '/profiles/by-handle/:handle'),
  follow: allpeepPayloadEndpoint<SuccessResponse, FollowData, { id: string }>(
    rawClient,
    '/profiles/:id/follow',
    'post',
  ),
  unfollow: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
    rawClient,
    '/profiles/:id/follow',
    'delete',
  ),
  followers: allpeepNoPayloadEndpoint<PublicProfile[], { id: string }>(
    rawClient,
    '/profiles/:id/followers',
  ),
  following: allpeepNoPayloadEndpoint<PublicProfile[], { id: string }>(
    rawClient,
    '/profiles/:id/following',
  ),
  commonGroups: allpeepNoPayloadEndpoint<
    GroupWithMeta[],
    { profileId: string }
  >(rawClient, '/profiles/:profileId/common-groups'),
});
