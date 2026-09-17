import type { OpenpeepsClient } from '@openpeepshq/client';
import {
  apiHook,
  payloadMutation,
  noPayloadMutation,
  infiniteChronologicalQueryApiHook,
} from '../helpers';
import { useHasAuthToken } from './useHasAuthToken';
import type {
  AccessTokenCreationData,
  AccessTokenWithMeta,
  ChronologicalInfiniteQueryParams,
  FollowData,
  GroupWithMeta,
  NotificationStats,
  NotificationType,
  ProfileData,
  ProfileSettings,
  ProfileSettingsData,
  ProfileWithMeta,
  PublicAccessToken,
  PublicNotification,
  PublicPost,
  PublicProfile,
  SuccessFailureResponse,
  SuccessResponse,
} from '@openpeepshq/common';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
  UseQueryResult,
} from '@tanstack/react-query';

type Query<T> = UseQueryResult<T, SuccessFailureResponse>;
type ChronologicalQuery<T> = UseInfiniteQueryResult<
  InfiniteData<T>,
  SuccessFailureResponse
>;

export type ProfileHooks = {
  useProfiles: () => Query<PublicProfile[]>;
  useProfile: (id: string) => Query<PublicProfile>;
  useProfileByHandle: (handle: string) => Query<PublicProfile>;
  useProfileFollowers: (id: string) => Query<PublicProfile[]>;
  useProfileFollowing: (id: string) => Query<PublicProfile[]>;
  followProfileAction: (defaultPathParams?: {
    id: string;
  }) => (
    input: FollowData,
    pathParams?: { id: string },
  ) => Promise<SuccessResponse>;
  unfollowProfileAction: (defaultPathParams?: {
    id: string;
  }) => (pathParams?: { id: string }) => Promise<SuccessResponse>;
  useCurrentProfile: () => Query<ProfileWithMeta>;
  updateCurrentProfileAction: (
    defaultPathParams?: undefined,
  ) => (input: ProfileData) => Promise<SuccessFailureResponse>;
  pinPostOnProfileAction: (
    defaultPathParams?: undefined,
  ) => (input: { postId: string }) => Promise<SuccessResponse>;
  useCurrentProfileNotifications: (
    props: ChronologicalInfiniteQueryParams,
  ) => ChronologicalQuery<PublicNotification[]>;
  markAllNotificationsAsSeenAction: () => () => () => Promise<SuccessResponse>;
  useCurrentProfileNotificationStats: () => Query<NotificationStats>;
  useCurrentProfileNotificationTypes: () => Query<NotificationType[]>;
  useCurrentProfileReposts: () => Query<PublicPost[]>;
  useCurrentProfileBookmarkedIds: () => Query<string[]>;
  useCommonGroups: (profileId: string) => Query<GroupWithMeta[]>;
  useCurrentProfileSettings: () => Query<ProfileSettings>;
  updateCurrentProfileSettingsAction: (
    defaultPathParams?: undefined,
  ) => (input: ProfileSettingsData) => Promise<ProfileSettings>;
  useCurrentProfileAccessTokens: () => Query<PublicAccessToken[]>;
  createCurrentProfileAccessTokenAction: (
    defaultPathParams?: undefined,
  ) => (input: AccessTokenCreationData) => Promise<AccessTokenWithMeta>;
  revokeCurrentProfileAccessTokenAction: (defaultPathParams?: {
    accessTokenId: string;
  }) => (pathParams?: { accessTokenId: string }) => Promise<SuccessResponse>;
};

export const profileHooks = (
  client: OpenpeepsClient,
  setCurrentProfile: (profile: ProfileWithMeta | undefined) => void,
): ProfileHooks => ({
  useProfiles: () => apiHook(client.profiles.list),
  useProfile: (id: string) =>
    apiHook(client.profiles.findById, { pathParams: { id } }),
  useProfileByHandle: (handle: string) =>
    apiHook(client.profiles.findByHandle, { pathParams: { handle } }),
  useProfileFollowers: (id: string) =>
    apiHook(client.profiles.followers, { pathParams: { id } }),
  useProfileFollowing: (id: string) =>
    apiHook(client.profiles.following, { pathParams: { id } }),
  followProfileAction: payloadMutation(client.profiles.follow, [['profiles']]),
  unfollowProfileAction: noPayloadMutation(client.profiles.unfollow, [
    ['profiles'],
  ]),
  blockProfileAction: noPayloadMutation(client.profiles.block, [['profiles']]),
  unblockProfileAction: noPayloadMutation(client.profiles.unblock, [
    ['profiles'],
  ]),
  useBlockedProfiles: () => apiHook(client.profiles.current.blocked),
  useCurrentProfile: () => {
    const hasToken = useHasAuthToken();
    return apiHook(client.profiles.current.read, {
      enabled: hasToken,
      onSuccess: setCurrentProfile,
    });
  },
  updateCurrentProfileAction: payloadMutation(client.profiles.current.update, [
    ['profiles', 'current'],
  ]),
  pinPostOnProfileAction: payloadMutation(client.profiles.current.pinPost, [
    ['profiles'],
    ['posts'],
  ]),
  useCurrentProfileNotifications: (props: ChronologicalInfiniteQueryParams) =>
    infiniteChronologicalQueryApiHook(client.profiles.current.notifications, {
      queryParams: props,
    }),
  markAllNotificationsAsSeenAction: () =>
    noPayloadMutation(client.profiles.current.markAllNotificationsAsSeen, [
      // Stats only — invalidating the feed refetches every loaded page and
      // races with infinite-scroll `fetchNextPage`, which resets the list.
      ['profiles', 'current', 'notifications', 'stats'],
    ]),
  useCurrentProfileNotificationStats: () =>
    apiHook(client.profiles.current.notificationStats),
  useCurrentProfileNotificationTypes: () =>
    apiHook(client.profiles.current.notificationTypes),
  useCurrentProfileReposts: () => apiHook(client.profiles.current.reposts),
  useCurrentProfileBookmarkedIds: () =>
    apiHook(client.profiles.current.bookmarkedIds),
  useCommonGroups: (profileId: string) =>
    apiHook(client.profiles.commonGroups, { pathParams: { profileId } }),
  useCurrentProfileSettings: () => {
    const hasToken = useHasAuthToken();
    return apiHook(client.profiles.current.readSettings, { enabled: hasToken });
  },
  updateCurrentProfileSettingsAction: payloadMutation(
    client.profiles.current.updateSettings,
    [['profiles', 'current', 'settings']],
  ),
  useCurrentProfileAccessTokens: () =>
    apiHook(client.profiles.current.accessTokens),
  createCurrentProfileAccessTokenAction: payloadMutation(
    client.profiles.current.createAccessToken,
    [['profiles', 'current', 'accessTokens']],
  ),
  revokeCurrentProfileAccessTokenAction: noPayloadMutation(
    client.profiles.current.revokeAccessToken,
    [['profiles', 'current', 'accessTokens']],
  ),
});
