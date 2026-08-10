import type { OpenpeepsClient } from '@openpeepshq/client';
import {
  apiHook,
  payloadMutation,
  noPayloadMutation,
  infiniteChronologicalQueryApiHook,
} from '../helpers';
import { useHasAuthToken } from './useHasAuthToken';
import type {
  ChronologicalInfiniteQueryParams,
  ProfileWithMeta,
} from '@openpeepshq/common';

export type ProfileHooks = ReturnType<typeof profileHooks>;

export const profileHooks = (
  client: OpenpeepsClient,
  setCurrentProfile: (profile: ProfileWithMeta | undefined) => void,
) => ({
  useProfiles: () => apiHook(client.profiles.list),
  useProfile: (id: string) =>
    apiHook(client.profiles.findById, { pathParams: { id } }),
  useProfileByHandle: (handle: string) =>
    apiHook(client.profiles.findByHandle, { pathParams: { handle } }),
  useProfileFollowers: (id: string) =>
    apiHook(client.profiles.followers, { pathParams: { id } }),
  useProfileFollowing: (id: string) =>
    apiHook(client.profiles.following, { pathParams: { id } }),
  followProfileAction: payloadMutation(client.profiles.follow, [
    ['profiles'],
  ]),
  unfollowProfileAction: noPayloadMutation(client.profiles.unfollow, [
    ['profiles'],
  ]),
  useCurrentProfile: () => {
    const hasToken = useHasAuthToken();
    return apiHook(client.profiles.current.read, {
      enabled: hasToken,
      onSuccess: setCurrentProfile,
    });
  },
  updateCurrentProfileAction: payloadMutation(
    client.profiles.current.update,
    [['profiles', 'current']],
  ),
  useCurrentProfileNotifications: (props: ChronologicalInfiniteQueryParams) =>
    infiniteChronologicalQueryApiHook(client.profiles.current.notifications, {
      queryParams: props,
    }),
  markAllNotificationsAsSeenAction: () =>
    noPayloadMutation(client.profiles.current.markAllNotificationsAsSeen, [
      ['profiles', 'current', 'notifications'],
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
