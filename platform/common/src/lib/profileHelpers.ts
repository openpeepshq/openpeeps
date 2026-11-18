import type {
  GroupWithMeta,
  InviteLinkWithMeta,
  JamWaitingProfile,
  ProfileSettings,
  ProfileWithMeta,
  PublicProfile,
  StripeSubscriptionData,
} from '../types';

const containsIgnoreCase = (candidate: string, query: string) =>
  candidate.toLowerCase().indexOf(query.toLowerCase()) > -1;

export const PROFILE_DISPLAY_NAME_MAX_LENGTH = 30;

/** Public sentinel shown for soft-deleted profiles (API + clients). */
export const DELETED_AUTHOR_DISPLAY_NAME = 'Deleted Profile';
export const DELETED_AUTHOR_HANDLE = 'deleted';

export const clampProfileDisplayName = (
  displayName: string | undefined | null,
): string | undefined => {
  if (!displayName) return undefined;
  const clamped = displayName.slice(0, PROFILE_DISPLAY_NAME_MAX_LENGTH);
  return clamped || undefined;
};

export const isDeletedProfile = (
  profile: { deletedAt?: string | null } | undefined | null,
): boolean => !!profile?.deletedAt;

/**
 * A deactivated member: soft-deleted row with the original identity stamped
 * into the body (deleted rows keep handle/displayName in their columns), so
 * an admin can tell the two states apart in the members table.
 */
// Hydrated `ProfileWithMeta` models are *flat* — `rowToModel` spreads the
// DB row's body jsonb into the model, so `deactivatedAt` lands top-level
// (there is no `.body` property). Both the flat and the raw-DB-row shapes are
// accepted so the helper works on either.
export const isDeactivatedProfile = (
  profile:
    | {
        deletedAt?: string | null;
        deactivatedAt?: string | null;
        body?: { deactivatedAt?: string | null } | null;
      }
    | undefined
    | null,
): boolean =>
  !!profile?.deletedAt &&
  (!!profile.deactivatedAt || !!profile.body?.deactivatedAt);

// `handle`/`displayName` arrive from untyped DB rows (`rowToModel`),
// so the hydration helper must accept `unknown`, not just `string | null`.
type DeletedProfileIdentity = {
  deletedAt?: string | null;
  displayName?: unknown;
  handle?: unknown;
};

/**
 * Deleted rows keep their original handle (the column is unique) and may have
 * no display name. Public hydration fills in the sentinel when it is missing.
 */
export const withDeletedProfileIdentity = <T extends DeletedProfileIdentity>(
  profile: T,
): T => {
  if (!isDeletedProfile(profile)) return profile;
  if (
    profile.displayName === DELETED_AUTHOR_DISPLAY_NAME &&
    profile.handle === DELETED_AUTHOR_HANDLE
  ) {
    return profile;
  }
  return {
    ...profile,
    displayName: DELETED_AUTHOR_DISPLAY_NAME,
    handle: DELETED_AUTHOR_HANDLE,
  };
};

/**
 * Strip PII from a soft-deleted profile for public API / UI surfaces.
 * Keeps id + timestamps (including deletedAt) so clients can detect the state.
 */
export const toPublicDeletedProfile = <T extends PublicProfile>(
  profile: T,
): T =>
  ({
    ...profile,
    displayName: DELETED_AUTHOR_DISPLAY_NAME,
    handle: DELETED_AUTHOR_HANDLE,
    avatar: null,
    header: null,
    bio: undefined,
    location: undefined,
    locked: undefined,
    bot: undefined,
    discoverable: undefined,
    memberships: [],
    fields: undefined,
    profileStats: undefined,
    pinnedPostId: undefined,
    roles: [],
  }) as T;

export const anonymizeProfileIfDeleted = <T extends PublicProfile>(
  profile: T | undefined | null,
): T | undefined => {
  if (!profile) return undefined;
  return isDeletedProfile(profile) ? toPublicDeletedProfile(profile) : profile;
};

/**
 * Tombstone for internal `ProfileWithMeta` surfaces (e.g. moderation reports).
 * Built explicitly rather than by spreading the original so no PII of the
 * deleted account (email/controllers, social graph, time zone, guest data)
 * can leak, while still satisfying `profileWithMetaSchema` — unlike
 * {@link toPublicDeletedProfile}, whose stripped shape is only valid for the
 * looser `publicProfileSchema`.
 */
export const toDeletedProfileWithMeta = (
  profile: ProfileWithMeta,
): ProfileWithMeta => ({
  id: profile.id,
  type: profile.type,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
  deletedAt: profile.deletedAt,
  handle: DELETED_AUTHOR_HANDLE,
  displayName: DELETED_AUTHOR_DISPLAY_NAME,
  avatar: null,
  header: null,
  roles: [],
  followers: [],
  following: [],
  controllers: [],
  memberships: [],
  profileStats: { followersCount: 0, followingCount: 0 },
  blockingIds: [],
  blockedByIds: [],
  followedHashtags: [],
});

/** Tombstone a `ProfileWithMeta` only when it is soft-deleted. */
export const tombstoneProfileWithMetaIfDeleted = (
  profile: ProfileWithMeta | undefined,
): ProfileWithMeta | undefined =>
  profile && isDeletedProfile(profile)
    ? toDeletedProfileWithMeta(profile)
    : profile;

/**
 * Tombstone for a profile that has been **hard** deleted — the row is gone so
 * there is nothing to spread. Built from just the id (recovered from the
 * surviving report edge) and the current timestamp, so historical reports can
 * still list (and serialize) as a tombstone. Same no-PII guarantee as
 * {@link toDeletedProfileWithMeta}: no handle/displayName of the deleted
 * account, empty social graph, zeroed stats.
 */
export const deletedProfileWithMeta = (
  id: string | undefined | null,
): ProfileWithMeta | undefined =>
  id
    ? {
        id,
        type: 'local',
        handle: DELETED_AUTHOR_HANDLE,
        displayName: DELETED_AUTHOR_DISPLAY_NAME,
        avatar: null,
        header: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: new Date().toISOString(),
        roles: [],
        followers: [],
        following: [],
        controllers: [],
        memberships: [],
        profileStats: { followersCount: 0, followingCount: 0 },
        blockingIds: [],
        blockedByIds: [],
        followedHashtags: [],
      }
    : undefined;

export const profileName = (profile?: PublicProfile) =>
  profile?.displayName || profile?.handle;

/** Display name for a waiting-room queue entry (queue stores only a name). */
export const waitingRoomEntryName = (entry?: JamWaitingProfile) =>
  entry?.displayName || `#${entry?.id.slice(0, 6)}`;

export const matchesQuery = (
  profile: PublicProfile | GroupWithMeta | undefined,
  query: string,
  queryOptions = { handle: true, displayName: true },
) =>
  !!(
    profile &&
    (query.startsWith('@')
      ? profile.handle && containsIgnoreCase(profile.handle, query.substring(1))
      : (queryOptions.handle &&
          profile.handle &&
          containsIgnoreCase(profile.handle, query)) ||
        (queryOptions.displayName &&
          profile.displayName &&
          containsIgnoreCase(profile.displayName, query)))
  );

export const inviteLinkMatchesQuery = (
  inviteLink: InviteLinkWithMeta,
  query: string,
  queryOptions = { handle: true, displayName: true, slug: true, group: true },
) => {
  const profile = inviteLink.profile as PublicProfile;
  const redemptionMatches = inviteLink.redemptions.some((r) =>
    matchesQuery(r, query, queryOptions),
  );
  if (query.startsWith('@')) {
    return !!(
      (profile?.handle &&
        containsIgnoreCase(profile.handle, query.substring(1))) ||
      redemptionMatches
    );
  }
  const groupMatches =
    queryOptions.group &&
    inviteLink.groups.some(
      (group) =>
        containsIgnoreCase(group.handle, query) ||
        (group.displayName && containsIgnoreCase(group.displayName, query)),
    );
  return !!(
    groupMatches ||
    redemptionMatches ||
    (profile &&
      ((queryOptions.handle &&
        profile.handle &&
        containsIgnoreCase(profile.handle, query)) ||
        (queryOptions.displayName &&
          profile.displayName &&
          containsIgnoreCase(profile.displayName, query)) ||
        (queryOptions.slug &&
          inviteLink.slug &&
          containsIgnoreCase(inviteLink.slug, query))))
  );
};

export const sortProfiles = (profiles: PublicProfile[]): PublicProfile[] =>
  profiles?.sort((a, b) =>
    (profileName(a) as string).localeCompare(profileName(b) as string),
  ) ?? [];

export const isStripeActive = (
  sub: StripeSubscriptionData | undefined | null,
) => sub?.status === 'active' || sub?.status === 'trialing';

export const getStripeCustomerId = (profileSettings: ProfileSettings) =>
  profileSettings?.stripeSettings?.customerId;

export const isOwnerProfile = (profile: ProfileWithMeta) => {
  return profile?.roles.some((role) => role.key === 'owner');
};

type BlockIdProfile = {
  blockingIds?: string[] | null;
  blockedByIds?: string[] | null;
};

export const blockedPairIds = (profile?: BlockIdProfile | null): string[] => [
  ...new Set([
    ...(profile?.blockingIds ?? []),
    ...(profile?.blockedByIds ?? []),
  ]),
];

export const isBlockedPair = (
  profile: BlockIdProfile | undefined | null,
  otherId: string | undefined | null,
): boolean => !!otherId && blockedPairIds(profile).includes(otherId);

export const viewerBlockedTarget = (
  profile: BlockIdProfile | undefined | null,
  otherId: string | undefined | null,
): boolean => !!otherId && (profile?.blockingIds ?? []).includes(otherId);

export const targetBlockedViewer = (
  profile: BlockIdProfile | undefined | null,
  otherId: string | undefined | null,
): boolean => !!otherId && (profile?.blockedByIds ?? []).includes(otherId);

export const sharesControllingAccount = (
  a: Pick<ProfileWithMeta, 'controllers'>,
  b: Pick<ProfileWithMeta, 'controllers'>,
): boolean => {
  const otherIds = new Set((b.controllers ?? []).map((account) => account.id));
  return (a.controllers ?? []).some((account) => otherIds.has(account.id));
};

export const toBlockedProfileStub = (
  profile: Pick<
    ProfileWithMeta,
    'id' | 'type' | 'createdAt' | 'updatedAt' | 'handle' | 'displayName'
  >,
): PublicProfile =>
  ({
    id: profile.id,
    type: profile.type,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    handle: profile.handle,
    displayName: profile.displayName,
    blockedByMe: true,
  }) as PublicProfile;
