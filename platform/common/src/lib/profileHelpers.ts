import type {
  GroupWithMeta,
  InviteLinkWithMeta,
  ProfileSettings,
  ProfileWithMeta,
  PublicProfile,
  StripeSubscriptionData,
} from '../types';

const containsIgnoreCase = (candidate: string, query: string) =>
  candidate.toLowerCase().indexOf(query.toLowerCase()) > -1;

export const PROFILE_DISPLAY_NAME_MAX_LENGTH = 30;

export const clampProfileDisplayName = (
  displayName: string | undefined | null,
): string | undefined => {
  if (!displayName) return undefined;
  const clamped = displayName.slice(0, PROFILE_DISPLAY_NAME_MAX_LENGTH);
  return clamped || undefined;
};

export const profileName = (profile?: PublicProfile) =>
  profile?.displayName || profile?.handle;

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
  if (query.startsWith('@')) {
    return !!(
      profile?.handle && containsIgnoreCase(profile.handle, query.substring(1))
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