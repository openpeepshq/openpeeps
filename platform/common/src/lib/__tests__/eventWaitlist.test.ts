import { describe, expect, it } from 'vitest';
import type { PublicPost, PublicProfile, PublicRsvp } from '../../types';
import {
  availableSpots,
  canClaimYesRsvp,
  canJoinWaitlist,
  capacityRsvpDecision,
  planWaitlistSync,
} from '../eventWaitlist';
import { normalizeEventDataForSave } from '../postHelpers';
import type { Event } from '../../types';

const profile = (
  id: string,
  type: PublicProfile['type'] = 'local',
): PublicProfile =>
  ({
    id,
    type,
    handle: id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as PublicProfile;

const rsvp = (
  id: string,
  response: PublicRsvp['response'],
  createdAt: string,
  extra: Partial<PublicRsvp> = {},
  type: PublicProfile['type'] = 'local',
): PublicRsvp => ({
  profile: profile(id, type),
  response,
  createdAt,
  ...extra,
});

const eventPost = (
  rsvps: PublicRsvp[],
  maxAttendees = 1,
  waitlistOfferMinutes = 60,
): PublicPost =>
  ({
    id: 'post-1',
    type: 'event',
    profile: profile('host'),
    data: {
      type: 'event',
      start: '2026-12-01T18:00:00.000Z',
      wholeDay: false,
      maxAttendees,
      waitlistOfferMinutes,
    },
    rsvps,
  }) as PublicPost;

const now = Date.parse('2026-10-14T12:00:00.000Z');

describe('event waitlist', () => {
  it('offers the earliest local member and holds the seat for them', () => {
    const post = eventPost([
      rsvp('a', 'waitlist', '2026-10-01T00:00:00.000Z', {
        waitlistJoinedAt: '2026-10-01T00:00:00.000Z',
      }),
      rsvp('b', 'waitlist', '2026-10-02T00:00:00.000Z', {
        waitlistJoinedAt: '2026-10-02T00:00:00.000Z',
      }),
    ]);

    const plan = planWaitlistSync(post, undefined, now);
    expect(plan.offers.map((offer) => offer.profileId)).toEqual(['a']);
    expect(plan.offers[0]?.offerExpiresAt).toBe('2026-10-14T13:00:00.000Z');
    expect(canClaimYesRsvp(post, 'b', undefined, now)).toBe(false);
    expect(canJoinWaitlist(post, 'c', undefined, now)).toBe(true);
    expect(availableSpots(post)).toBe(0);
  });

  it('lets only the member with the open offer claim the seat', () => {
    const post = eventPost([
      rsvp('a', 'waitlist', '2026-10-01T00:00:00.000Z', {
        waitlistJoinedAt: '2026-10-01T00:00:00.000Z',
        offerExpiresAt: '2026-10-14T13:00:00.000Z',
      }),
      rsvp('b', 'waitlist', '2026-10-02T00:00:00.000Z', {
        waitlistJoinedAt: '2026-10-02T00:00:00.000Z',
      }),
    ]);

    expect(canClaimYesRsvp(post, 'a', undefined, now)).toBe(true);
    expect(canClaimYesRsvp(post, 'b', undefined, now)).toBe(false);
    expect(planWaitlistSync(post, undefined, now).offers).toEqual([]);
  });

  it('moves an expired offer to the back and offers the next member', () => {
    const post = eventPost([
      rsvp('a', 'waitlist', '2026-10-01T00:00:00.000Z', {
        waitlistJoinedAt: '2026-10-01T00:00:00.000Z',
        offerExpiresAt: '2026-10-14T11:00:00.000Z',
      }),
      rsvp('b', 'waitlist', '2026-10-02T00:00:00.000Z', {
        waitlistJoinedAt: '2026-10-02T00:00:00.000Z',
      }),
    ]);

    const plan = planWaitlistSync(post, undefined, now);
    expect(plan.requeues.map((entry) => entry.profileId)).toEqual(['a']);
    expect(plan.requeues[0]?.waitlistJoinedAt).toBe('2026-10-14T12:00:00.000Z');
    expect(plan.offers.map((offer) => offer.profileId)).toEqual(['b']);
    expect(plan.clearOffers.map((entry) => entry.profileId)).toEqual(['a']);
  });

  it('refuses a second claim after the seat is taken', () => {
    const open = eventPost([
      rsvp('a', 'waitlist', '2026-10-01T00:00:00.000Z', {
        waitlistJoinedAt: '2026-10-01T00:00:00.000Z',
        offerExpiresAt: '2026-10-14T13:00:00.000Z',
      }),
      rsvp('b', 'waitlist', '2026-10-02T00:00:00.000Z', {
        waitlistJoinedAt: '2026-10-02T00:00:00.000Z',
      }),
    ]);
    const claimed = eventPost([
      ...open.rsvps!,
      rsvp('a', 'yes', '2026-10-14T12:05:00.000Z'),
    ]);

    expect(canClaimYesRsvp(claimed, 'a', undefined, now)).toBe(true);
    expect(canClaimYesRsvp(claimed, 'b', undefined, now)).toBe(false);
    expect(capacityRsvpDecision(claimed, 'b', 'yes', undefined, now)).toEqual({
      ok: false,
      errorKey: 'error.eventAtCapacity',
    });
  });

  it('withdraws a second offer when only one seat is open', () => {
    const post = eventPost(
      [
        rsvp('a', 'waitlist', '2026-10-01T00:00:00.000Z', {
          waitlistJoinedAt: '2026-10-01T00:00:00.000Z',
          offerExpiresAt: '2026-10-14T12:30:00.000Z',
        }),
        rsvp('b', 'waitlist', '2026-10-02T00:00:00.000Z', {
          waitlistJoinedAt: '2026-10-02T00:00:00.000Z',
          offerExpiresAt: '2026-10-14T12:45:00.000Z',
        }),
      ],
      1,
    );

    const plan = planWaitlistSync(post, undefined, now);
    expect(plan.withdraws.map((entry) => entry.profileId)).toEqual(['b']);
    expect(plan.offers).toEqual([]);
  });

  it('does not offer federated profiles', () => {
    const post = eventPost([
      rsvp(
        'remote',
        'waitlist',
        '2026-10-01T00:00:00.000Z',
        { waitlistJoinedAt: '2026-10-01T00:00:00.000Z' },
        'federated',
      ),
      rsvp('local', 'waitlist', '2026-10-02T00:00:00.000Z', {
        waitlistJoinedAt: '2026-10-02T00:00:00.000Z',
      }),
    ]);

    expect(planWaitlistSync(post, undefined, now).offers[0]?.profileId).toBe(
      'local',
    );
  });

  it('rejects waitlist joins while a seat is still free', () => {
    const post = eventPost([]);
    expect(capacityRsvpDecision(post, 'a', 'waitlist', undefined, now)).toEqual(
      {
        ok: false,
        errorKey: 'error.eventWaitlistNotOpen',
      },
    );
    expect(canClaimYesRsvp(post, 'a', undefined, now)).toBe(true);
  });

  it('strips the response window when capacity is cleared', () => {
    const base = {
      type: 'event',
      start: '2026-12-01T18:00:00.000Z',
      wholeDay: false,
    } as Event;
    expect(
      normalizeEventDataForSave({
        ...base,
        maxAttendees: 4,
        waitlistOfferMinutes: 15,
      }),
    ).toEqual({ ...base, maxAttendees: 4, waitlistOfferMinutes: 15 });
    expect(
      normalizeEventDataForSave({
        ...base,
        maxAttendees: 4,
        waitlistOfferMinutes: 0,
      }),
    ).toEqual({ ...base, maxAttendees: 4 });
    expect(
      normalizeEventDataForSave({
        ...base,
        waitlistOfferMinutes: 15,
      }),
    ).toEqual(base);
  });
});
