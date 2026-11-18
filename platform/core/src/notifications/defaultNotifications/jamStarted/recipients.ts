import {
  calculateEffectiveRsvps,
  occurrenceForJamStart,
} from '@openpeepshq/common/lib';
import type {
  Event,
  PostWithMeta,
  ProfileSettings,
  ProfileWithMeta,
  PublicRsvp,
} from '@openpeepshq/common/types';
import {
  findProfile,
  listProfiles,
  listGroupMembers,
} from '@openpeepshq/core/profiles';
import { findProfileSettings } from '../../../profileSettings';
import { groupNotificationLevelFor } from '../../helpers';

const yesOrMaybe = (response: PublicRsvp['response']) =>
  response === 'yes' || response === 'tentative';

/** Effective (yes/maybe) RSVP profile ids for the jam occurrence being opened. */
const rsvpedProfileIds = (
  post: PostWithMeta,
  recurrenceId: string | undefined,
): Set<string> => {
  // `post.data` is narrowed to the event discriminant by the caller.
  const occurrence = occurrenceForJamStart(post.data as Event, {
    recurrenceId,
  });
  return new Set(
    calculateEffectiveRsvps(post, occurrence?.recurrenceId)
      .filter((rsvp) => yesOrMaybe(rsvp.response))
      .map((rsvp) => rsvp.profile.id),
  );
};

export interface JamStartAudience {
  profiles: ProfileWithMeta[];
  groupId?: string;
}

/**
 * Profiles the creator explicitly designated for the jam (moderators and
 * speakers). They always get the start alert regardless of the member's
 * group-notification level. `known` is the set of audience profiles already
 * loaded for this post, so a designated recipient who is also in the audience
 * is not re-fetched; dedup against the accumulating audience happens in
 * `jamStartAudience`'s `add`, which drops any profile already present.
 */
const designatedJamRecipients = async (
  jam: {
    moderators?: string[];
    speakers?: string[];
  },
  known: Map<string, ProfileWithMeta>,
): Promise<ProfileWithMeta[]> => {
  const seen = new Set<string>();
  const recipients: ProfileWithMeta[] = [];
  for (const id of [...(jam.moderators ?? []), ...(jam.speakers ?? [])]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const cached = known.get(id);
    if (cached) {
      recipients.push(cached);
      continue;
    }
    const profile = await findProfile(id);
    if (profile) recipients.push(profile);
  }
  return recipients;
};

/**
 * Recipients for a "started a jam" alert. Community-wide jams (public/local)
 * only broadcast when the creator opted in; group and direct jams notify
 * their own audience and the designated moderators/speakers by default. The
 * group notification level then applies: `off` silences the group's jams,
 * `mostRelevant` keeps members with an RSVP (yes/maybe) to this event.
 * Designated moderators/speakers are not level-gated, matching the pre-opt-in
 * behavior where they were always notified.
 */
export const jamStartAudience = async (
  creator: ProfileWithMeta,
  post: PostWithMeta,
  recurrenceId: string | undefined,
): Promise<JamStartAudience> => {
  if (!post.data || post.data.type !== 'event') return { profiles: [] };
  const event = post.data;
  const jam = event.jam;
  if (!jam) return { profiles: [] };

  const groupId = post.group?.id;

  if (['local', 'public'].includes(post.visibility)) {
    if (!jam.notifyEveryone) return { profiles: [] };
    return {
      profiles: (await listProfiles()).filter(
        (candidate) => candidate && candidate.id !== creator.id,
      ),
    };
  }

  let audience: ProfileWithMeta[] = [];
  if (post.visibility === 'group') {
    if (!post.group) return { profiles: [] };
    for (const member of await listGroupMembers(post.group)) {
      if (member.profile?.id) audience.push(member.profile);
    }
  } else {
    for (const audienceEntry of post.audience ?? []) {
      if (audienceEntry?.id) audience.push(audienceEntry as ProfileWithMeta);
    }
  }

  const profiles: ProfileWithMeta[] = [];
  const add = (profile?: ProfileWithMeta) => {
    if (!profile || profile.id === creator.id) return;
    if (profiles.some((existing) => existing.id === profile.id)) return;
    profiles.push(profile);
  };

  // Lazy: only members at `mostRelevant` consult the RSVP set. On the direct
  // path the level is always `all` (no group), so it stays uncaptured — that
  // holds because a post carrying `post.group` takes the group branch, so on
  // the direct path `groupId` is undefined and `groupNotificationLevelFor`
  // short-circuits to `all` before any level is looked up.
  let rsvpedIds: Set<string> | undefined;
  const hasRsvp = (profileId: string) => {
    rsvpedIds ??= rsvpedProfileIds(post, recurrenceId);
    return rsvpedIds.has(profileId);
  };

  for (const profile of audience) {
    if (!profile || profile.id === creator.id) continue;
    const settings: ProfileSettings | undefined = await findProfileSettings(
      profile.id,
    );
    const level = groupNotificationLevelFor(settings, groupId);
    if (level === 'off') continue;
    if (level === 'mostRelevant' && !hasRsvp(profile.id)) continue;
    add(profile);
  }

  const loaded = new Map<string, ProfileWithMeta>(
    audience.filter(Boolean).map((profile) => [profile.id, profile]),
  );
  for (const profile of await designatedJamRecipients(jam, loaded))
    add(profile);

  return { profiles, ...(groupId ? { groupId } : {}) };
};
