import type { Event, PublicPost, PublicRsvp, RsvpResponse } from '../types';
import { listRsvpOccurrences } from './eventRecurrence';
import {
  calculateEffectiveRsvps,
  countYesRsvps,
  getEffectiveRsvp,
  normalizeWaitlistOfferMinutes,
  DEFAULT_WAITLIST_OFFER_MINUTES,
} from './postHelpers';

export type WaitlistMember = {
  profileId: string;
  profileType: PublicRsvp['profile']['type'];
  joinedAt: string;
  offerExpiresAt?: string;
};

export type WaitlistEntryWrite = {
  profileId: string;
  recurrenceId?: string;
  waitlistJoinedAt: string;
  offerExpiresAt?: string;
};

export type WaitlistSyncPlan = {
  /** Expired offers move to the back of the line. */
  requeues: WaitlistEntryWrite[];
  /** Offers withdrawn because the seat was taken. Position is kept. */
  withdraws: WaitlistEntryWrite[];
  offers: WaitlistEntryWrite[];
  clearOffers: { profileId: string; recurrenceId?: string }[];
};

export type CapacityRsvpDecision =
  | { ok: true; occurrenceIds?: string[] }
  | { ok: false; errorKey: string };

const offerOpen = (offerExpiresAt: string | undefined, now: number) =>
  !!offerExpiresAt && Date.parse(offerExpiresAt) > now;

const byJoinedAt = (a: WaitlistMember, b: WaitlistMember) =>
  Date.parse(a.joinedAt) - Date.parse(b.joinedAt) ||
  a.profileId.localeCompare(b.profileId);

const eventOf = (post: PublicPost) =>
  post.data?.type === 'event' ? post.data : undefined;

/**
 * Waitlist state is a local RSVP entry, not an ActivityPub activity. Remote
 * actors are not offered seats: the claim link and response window use local
 * in-app, email, and push delivery.
 */
export const orderedWaitlist = (
  post: PublicPost,
  recurrenceId?: string,
): WaitlistMember[] =>
  calculateEffectiveRsvps(post, recurrenceId)
    .filter((rsvp) => rsvp.response === 'waitlist')
    .map((rsvp) => ({
      profileId: rsvp.profile.id,
      profileType: rsvp.profile.type,
      joinedAt: rsvp.waitlistJoinedAt ?? rsvp.createdAt,
      offerExpiresAt: rsvp.offerExpiresAt,
    }))
    .sort(byJoinedAt);

export const waitlistOfferWindowMs = (event: Event) =>
  (normalizeWaitlistOfferMinutes(event.waitlistOfferMinutes) ??
    DEFAULT_WAITLIST_OFFER_MINUTES) * 60_000;

export const offerStillOpen = (
  rsvp: Pick<PublicRsvp, 'offerExpiresAt'> | undefined,
  now = Date.now(),
) => offerOpen(rsvp?.offerExpiresAt, now);

/** Seats a member who is not already attending can still take. */
export const canClaimYesRsvp = (
  post: PublicPost,
  profileId: string,
  recurrenceId?: string,
  now = Date.now(),
) => {
  const event = eventOf(post);
  if (!event?.maxAttendees) return true;
  const current = getEffectiveRsvp(post, profileId, recurrenceId);
  if (current?.response === 'yes') return true;
  if (countYesRsvps(post, recurrenceId) >= event.maxAttendees) return false;
  const waiting = orderedWaitlist(post, recurrenceId);
  const mine = waiting.find((member) => member.profileId === profileId);
  if (mine && offerOpen(mine.offerExpiresAt, now)) return true;
  return !waiting.some((member) => member.profileType !== 'federated');
};

export const canJoinWaitlist = (
  post: PublicPost,
  profileId: string,
  recurrenceId?: string,
  now = Date.now(),
) => {
  const event = eventOf(post);
  if (!event?.maxAttendees) return false;
  const current = getEffectiveRsvp(post, profileId, recurrenceId);
  if (
    current?.response === 'yes' ||
    current?.response === 'removed' ||
    current?.response === 'waitlist' ||
    current?.response === 'tentative'
  ) {
    return false;
  }
  return !canClaimYesRsvp(post, profileId, recurrenceId, now);
};

export const seriesHasClaimableOccurrence = (
  post: PublicPost,
  profileId: string,
  now = new Date(),
) => {
  const event = eventOf(post);
  if (!event) return false;
  if (!event.recurrence) {
    return canClaimYesRsvp(post, profileId, undefined, now.getTime());
  }
  const occurrences = listRsvpOccurrences(event, now);
  if (!occurrences.length) {
    return canClaimYesRsvp(post, profileId, undefined, now.getTime());
  }
  return occurrences.some((occurrence) =>
    canClaimYesRsvp(post, profileId, occurrence.recurrenceId, now.getTime()),
  );
};

export const seriesClaimBlocked = (
  post: PublicPost,
  profileId: string,
  now = new Date(),
) => {
  const event = eventOf(post);
  if (!event?.maxAttendees) return false;
  if (!event.recurrence) {
    return !canClaimYesRsvp(post, profileId, undefined, now.getTime());
  }
  const occurrences = listRsvpOccurrences(event, now);
  if (!occurrences.length) {
    return !canClaimYesRsvp(post, profileId, undefined, now.getTime());
  }
  return occurrences.some(
    (occurrence) =>
      !canClaimYesRsvp(post, profileId, occurrence.recurrenceId, now.getTime()),
  );
};

/** Public seat count. Seats held for the waitlist are not available. */
export const availableSpots = (
  post: PublicPost,
  recurrenceId?: string,
): number | undefined => {
  const event = eventOf(post);
  if (!event?.maxAttendees) return undefined;
  if (event.recurrence && recurrenceId === undefined) return undefined;
  const open = event.maxAttendees - countYesRsvps(post, recurrenceId);
  if (open <= 0) return 0;
  const localWaiting = orderedWaitlist(post, recurrenceId).some(
    (member) => member.profileType !== 'federated',
  );
  if (localWaiting) return 0;
  return open;
};

export const waitlistClaimPath = (postId: string, recurrenceId?: string) => {
  const query = new URLSearchParams({ claim: '1' });
  if (recurrenceId) query.set('recurrenceId', recurrenceId);
  return `/posts/${postId}?${query.toString()}`;
};

export type WaitlistOfferNotice = {
  offerExpiresAt: string;
  recurrenceId?: string;
};

export const isWaitlistOfferNotice = (
  data: unknown,
): data is WaitlistOfferNotice => {
  if (!data || typeof data !== 'object') return false;
  const notice = data as WaitlistOfferNotice;
  return typeof notice.offerExpiresAt === 'string';
};

const emptyPlan = (): WaitlistSyncPlan => ({
  requeues: [],
  withdraws: [],
  offers: [],
  clearOffers: [],
});

/**
 * Ordered offer: the earliest local member without an open offer gets the
 * seat. A missed window moves that member behind everyone still waiting.
 */
export const planWaitlistSync = (
  post: PublicPost,
  recurrenceId: string | undefined,
  now = Date.now(),
): WaitlistSyncPlan => {
  const event = eventOf(post);
  if (!event?.maxAttendees) return emptyPlan();

  const members = orderedWaitlist(post, recurrenceId).map((member) => ({
    ...member,
  }));
  const plan = emptyPlan();
  const joinedNow = new Date(now).toISOString();

  for (const member of members) {
    if (!member.offerExpiresAt || offerOpen(member.offerExpiresAt, now)) {
      continue;
    }
    plan.clearOffers.push({ profileId: member.profileId, recurrenceId });
    plan.requeues.push({
      profileId: member.profileId,
      recurrenceId,
      waitlistJoinedAt: joinedNow,
    });
    member.joinedAt = joinedNow;
    member.offerExpiresAt = undefined;
  }
  members.sort(byJoinedAt);

  const spots = Math.max(
    0,
    event.maxAttendees - countYesRsvps(post, recurrenceId),
  );
  const active = members
    .filter((member) => offerOpen(member.offerExpiresAt, now))
    .sort(
      (a, b) =>
        Date.parse(a.offerExpiresAt ?? '') - Date.parse(b.offerExpiresAt ?? ''),
    );
  for (const member of active.slice(spots)) {
    plan.clearOffers.push({ profileId: member.profileId, recurrenceId });
    plan.withdraws.push({
      profileId: member.profileId,
      recurrenceId,
      waitlistJoinedAt: member.joinedAt,
    });
    member.offerExpiresAt = undefined;
  }

  const openings =
    spots -
    members.filter((member) => offerOpen(member.offerExpiresAt, now)).length;
  if (openings <= 0) return plan;

  const expires = new Date(now + waitlistOfferWindowMs(event)).toISOString();
  const offerable = members.filter(
    (member) =>
      member.profileType !== 'federated' &&
      !offerOpen(member.offerExpiresAt, now),
  );
  for (const member of offerable.slice(0, openings)) {
    plan.offers.push({
      profileId: member.profileId,
      recurrenceId,
      waitlistJoinedAt: member.joinedAt,
      offerExpiresAt: expires,
    });
  }
  return plan;
};

export const capacityRsvpDecision = (
  post: PublicPost,
  profileId: string,
  response: RsvpResponse,
  occurrenceIds: string[] | undefined,
  now = Date.now(),
): CapacityRsvpDecision => {
  const event = eventOf(post);
  if (!event?.maxAttendees) {
    return response === 'waitlist'
      ? { ok: false, errorKey: 'error.eventWaitlistNotOpen' }
      : { ok: true, occurrenceIds };
  }
  if (response === 'tentative') {
    return { ok: false, errorKey: 'error.eventTentativeNotAllowed' };
  }
  if (response === 'waitlist') {
    if (event.recurrence && !occurrenceIds?.length) {
      return { ok: false, errorKey: 'error.eventWaitlistNeedsDate' };
    }
    const ids = occurrenceIds ?? [undefined];
    const blocked = ids.some((id) => {
      const current = getEffectiveRsvp(post, profileId, id);
      if (current?.response === 'waitlist') return false;
      return !canJoinWaitlist(post, profileId, id, now);
    });
    if (blocked) {
      return { ok: false, errorKey: 'error.eventWaitlistNotOpen' };
    }
    const joinable = ids.filter(
      (id) => getEffectiveRsvp(post, profileId, id)?.response !== 'waitlist',
    );
    if (!joinable.length) return { ok: true, occurrenceIds: [] };
    if (joinable.length === 1 && joinable[0] === undefined) {
      return { ok: true, occurrenceIds: undefined };
    }
    return {
      ok: true,
      occurrenceIds: joinable.filter((id): id is string => !!id),
    };
  }
  if (response === 'yes') {
    if (!occurrenceIds?.length && event.recurrence) {
      if (seriesClaimBlocked(post, profileId, new Date(now))) {
        return { ok: false, errorKey: 'error.eventAtCapacity' };
      }
      return { ok: true, occurrenceIds };
    }
    const ids = occurrenceIds ?? [undefined];
    if (ids.some((id) => !canClaimYesRsvp(post, profileId, id, now))) {
      return { ok: false, errorKey: 'error.eventAtCapacity' };
    }
  }
  return { ok: true, occurrenceIds };
};
