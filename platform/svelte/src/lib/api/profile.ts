import type {
	AccessTokenCreationData,
	AccessTokenWithMeta,
	ChronologicalInfiniteQueryParams,
	ProfileWithMeta,
	PublicAccessToken,
	SuccessResponse,
} from "@openpeeps/common/types";
import { readable, writable } from "svelte/store";
import { clearCredentials, getCredentials } from "$lib/auth";
import {
	client,
	infiniteChronologicalStore,
	noPayloadMutation,
	payloadMutation,
	simpleStore,
} from "./helpers";

export const updateCurrentProfileMutation = payloadMutation(
	client.profiles.current.update,
	{
		queryKeys: [["profiles", "current"]],
	},
);

const writableMe = writable<ProfileWithMeta>(undefined);

export const me = readable<ProfileWithMeta>(undefined, (set) => {
	simpleStore(client.profiles.current.read, {
		onSuccess: (profile) => writableMe.set(profile),
		preQueryCheck: () => {
			if (!getCredentials().token) {
				throw { success: false, message: "No credentials found." };
			}
		},
	})?.subscribe((response) => {
		if (response.data) {
			set(response.data);
		}
	});
});
export const currentProfileStore = () =>
	simpleStore(client.profiles.current.read, {
		onSuccess: (profile) => writableMe.set(profile),
		onError: (error) => {
			console.log('error', error);
			clearCredentials();
		},
		preQueryCheck: () => {
			if (!getCredentials().token) {
				throw { success: false, message: "No credentials found." };
			}
		},
	});

export const followProfileMutation = payloadMutation(client.profiles.follow, {
	queryKeys: [["profiles", "current"]],
});

export const unFollowProfileMutation = noPayloadMutation(
	client.profiles.unfollow,
	{
		queryKeys: [["profiles", "current"]],
	},
);

export const currentProfileNotificationsStore = () =>
	simpleStore(client.profiles.current.notifications);

export const infiniteCurrentProfileNotificationsStore = (
	props: ChronologicalInfiniteQueryParams,
) =>
	infiniteChronologicalStore(client.profiles.current.notifications, {
		queryParams: props,
	});

export const currentProfileNotificationsStatsStore = () =>
	simpleStore(client.profiles.current.notificationStats);

export const currentProfileNotificationTypesStore = () =>
	simpleStore(client.profiles.current.notificationTypes);

export const markAllNotificationsAsSeenMutation = noPayloadMutation(
	client.profiles.current.markAllNotificationsAsSeen,
	{
		queryKeys: [["profiles", "current", "notifications"]],
	},
);

export const profileStore = (id: string) =>
	simpleStore(client.profiles.findById, { pathParams: { id } });

export const profileByHandleStore = (handle: string) =>
	simpleStore(client.profiles.findByHandle, { pathParams: { handle } });

export const profileFeedStore = (id: string) =>
	simpleStore(client.posts.listByProfile, { pathParams: { id } });

export const infiniteProfileFeedStore = (
	id: string,
	props: ChronologicalInfiniteQueryParams,
) =>
	infiniteChronologicalStore(client.posts.listByProfile, {
		queryParams: props,
		pathParams: { id },
	});

export const currentProfileReposts = () =>
	simpleStore(client.profiles.current.reposts);

export const currentProfileBookmarkedIds = () =>
	simpleStore(client.profiles.current.bookmarkedIds);

export const profilesStore = () => simpleStore(client.profiles.list);

export const followersStore = (id: string) =>
	simpleStore(client.profiles.followers, { pathParams: { id } });

export const followingStore = (id: string) =>
	simpleStore(client.profiles.following, { pathParams: { id } });

export const commonGroupsStore = (profileId: string) =>
	simpleStore(client.profiles.commonGroups, { pathParams: { profileId } });

export const currentProfileSettingsStore = () =>
	simpleStore(client.profiles.current.readSettings, {
		preQueryCheck: () => {
			if (!getCredentials().token) {
				throw { success: false, message: "No credentials found." };
			}
		},
	});

export const updateProfileSettingsMutation = payloadMutation(
	client.profiles.current.updateSettings,
	{
		queryKeys: [["profiles", "current", "settings"]],
	},
);

export const currentProfileAccessTokensStore = () =>
	simpleStore<PublicAccessToken[]>(
		client.profiles.current.accessTokens,
		{
		preQueryCheck: () => {
			if (!getCredentials().token) {
				throw { success: false, message: "No credentials found." };
			}
		},
		},
	);

export const createCurrentProfileAccessTokenMutation = payloadMutation<
	AccessTokenCreationData,
	AccessTokenWithMeta
>(
	client.profiles.current.createAccessToken,
	{
		queryKeys: [["profiles", "current", "accessTokens"]],
	},
);

export const revokeCurrentProfileAccessTokenMutation = noPayloadMutation<
	SuccessResponse,
	{ accessTokenId: string }
>(
	client.profiles.current.revokeAccessToken,
	{
		queryKeys: [["profiles", "current", "accessTokens"]],
	},
);