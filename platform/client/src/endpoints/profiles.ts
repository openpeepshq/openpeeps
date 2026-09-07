import type {
  FetchClient,
  noPayloadEventSource,
} from '@openpeepshq/fetch-client';
import type {
  AccessTokenCreationData,
  AccessTokenWithMeta,
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
  PluginSettingsEnvelope,
  PluginSettingsPatch,
  ProfileSettings,
  ProfileSettingsUpdateData,
  PublicAccessToken,
  SessionEvent,
  SessionPlatform,
} from '@openpeepshq/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

type PluginSettingsPath = { namespace: string; name: string };

const createUpdatePluginSettings = (rawClient: FetchClient) => {
  const endpoint = allpeepPayloadEndpoint<
    PluginSettingsEnvelope,
    string,
    PluginSettingsPath
  >(rawClient, '/profiles/current/pluginSettings/:namespace/:name', 'patch');

  const update = (
    patch: PluginSettingsPatch,
    options?: Parameters<typeof endpoint>[1],
  ) =>
    endpoint(JSON.stringify(patch), {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

  update.queryKey = endpoint.queryKey;
  return update;
};

export const profiles = (
  rawClient: FetchClient,
  eventSource: ReturnType<typeof noPayloadEventSource>,
) => ({
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
    updateSettings: allpeepPayloadEndpoint<
      ProfileSettings,
      ProfileSettingsUpdateData
    >(rawClient, '/profiles/current/settings', 'put'),
    readPluginSettings: allpeepNoPayloadEndpoint<
      PluginSettingsEnvelope,
      PluginSettingsPath
    >(rawClient, '/profiles/current/pluginSettings/:namespace/:name'),
    updatePluginSettings: createUpdatePluginSettings(rawClient),
    accessTokens: allpeepNoPayloadEndpoint<PublicAccessToken[]>(
      rawClient,
      '/profiles/current/access-tokens',
    ),
    createAccessToken: allpeepPayloadEndpoint<
      AccessTokenWithMeta,
      AccessTokenCreationData
    >(rawClient, '/profiles/current/access-tokens', 'post'),
    revokeAccessToken: allpeepNoPayloadEndpoint<
      SuccessResponse,
      { accessTokenId: string }
    >(rawClient, '/profiles/current/access-tokens/:accessTokenId', 'delete'),
    sessionEvents: {
      listen: eventSource<
        SessionEvent,
        undefined,
        { platform: SessionPlatform; connectionId: string }
      >('/profiles/current/session/events'),
    },
  },

  list: allpeepNoPayloadEndpoint<PublicProfile[]>(rawClient, '/profiles'),
  findById: allpeepNoPayloadEndpoint<PublicProfile, { id: string }>(
    rawClient,
    '/profiles/:id',
  ),
  findByHandle: allpeepNoPayloadEndpoint<PublicProfile, { handle: string }>(
    rawClient,
    '/profiles/by-handle/:handle',
  ),
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
