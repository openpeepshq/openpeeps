import { describe, expect, it, vi } from 'vitest';

// Regression test for #2000: these endpoints used to `throw notFound(...)`
// from `#lib/helpers`, which produces a `Response` — not an
// `__HTTP_ERROR__`-marked object — so Riddl's catch reported an internal
// error and the client got a 500. They now throw the `#lib/errors` variant,
// which Riddl translates to a 404 with the message below. Calling
// `apiEndpoint.handle` directly runs the real handler unmocked; asserting the
// rejection (not the returned object) is what pins the throw contract.
vi.mock('#lib/auth', () => ({
  ensureLocalProfile: vi.fn(async () => undefined),
  ensureProfileOrGuest: vi.fn(async () => undefined),
  ensurePostCapabilities: vi.fn(async () => undefined),
  ensureProfileCapabilities: vi.fn(async () => undefined),
}));

vi.mock('@openpeepshq/core/jams', () => ({
  findJamEvent: vi.fn(),
  findActiveRtmpStream: vi.fn(),
  listJamEvents: vi.fn(),
  listParticipantIds: vi.fn(),
  listAttendance: vi.fn(),
  startRtmpStream: vi.fn(),
  stopRtmpStream: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  getJamObserverPath: vi.fn(),
}));

vi.mock('@openpeepshq/core/profiles', () => ({
  findProfile: vi.fn(),
  follow: vi.fn(),
  unfollow: vi.fn(),
}));

vi.mock('@openpeepshq/common/lib', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openpeepshq/common/lib')>();
  return {
    ...actual,
    canModerateJam: vi.fn(() => true),
    isBlockedPair: vi.fn(() => false),
  };
});

import {
  findJamEvent,
  findActiveRtmpStream,
  stopRecording,
} from '@openpeepshq/core/jams';
import { findProfile } from '@openpeepshq/core/profiles';
import { isBlockedPair } from '@openpeepshq/common/lib';
import { apiEndpoint as eventsGetEndpoint } from '../../api/openpeeps/core/v1/jams/[eventId]/events/GET';
import { apiEndpoint as eventsPostEndpoint } from '../../api/openpeeps/core/v1/jams/[eventId]/events/POST';
import { apiEndpoint as attendanceEndpoint } from '../../api/openpeeps/core/v1/jams/[eventId]/events/attendance/GET';
import { apiEndpoint as streamsGetEndpoint } from '../../api/openpeeps/core/v1/jams/[eventId]/streams/GET';
import { apiEndpoint as streamsPostEndpoint } from '../../api/openpeeps/core/v1/jams/[eventId]/streams/POST';
import { apiEndpoint as streamsStopEndpoint } from '../../api/openpeeps/core/v1/jams/[eventId]/streams/stop/PUT';
import { apiEndpoint as recordingsPostEndpoint } from '../../api/openpeeps/core/v1/jams/[eventId]/recordings/POST';
import { apiEndpoint as recordingsStopEndpoint } from '../../api/openpeeps/core/v1/jams/[eventId]/recordings/stop/PUT';
import { apiEndpoint as observerLinkEndpoint } from '../../api/openpeeps/core/v1/jams/[eventId]/recordings/observer-link/GET';
import {
  followProfileHandler,
  unfollowProfileHandler,
} from '../handlers/profile/follow';

const jamEvent = {
  id: 'jam-1',
  profile: { id: 'owner' },
  data: { type: 'event', jam: { moderators: ['owner'] } },
} as never;

type Rejects404 = {
  status: number;
  message: string;
  __HTTP_ERROR__: true;
};

const rejects404 = async (
  promise: Promise<unknown>,
  message: string,
): Promise<Rejects404> => {
  let err: unknown;
  try {
    await promise;
  } catch (e) {
    err = e;
  }
  expect(err).toBeDefined();
  expect((err as { status: number }).status).toBe(404);
  expect((err as { __HTTP_ERROR__: boolean }).__HTTP_ERROR__).toBe(true);
  expect((err as { message: string }).message).toBe(message);
  return err as Rejects404;
};

const call = (endpoint: {
  handle: (input: Record<string, unknown>) => Promise<unknown>;
}) => endpoint.handle({ eventId: 'missing' });

// The auth handlers are mocked away, so an empty event object satisfies the
// type at every site.
const emptyEvent = {} as never;

describe('jam not-found paths return real 404s (#2000)', () => {
  it.each([
    [eventsGetEndpoint, 'events/GET'],
    [eventsPostEndpoint, 'events/POST'],
    [attendanceEndpoint, 'events/attendance/GET'],
    [streamsPostEndpoint, 'streams/POST'],
    [streamsStopEndpoint, 'streams/stop/PUT'],
    [recordingsPostEndpoint, 'recordings/POST'],
    [observerLinkEndpoint, 'recordings/observer-link/GET'],
  ])('%s: unknown eventId throws a 404', async (endpoint, _name) => {
    vi.mocked(findJamEvent).mockResolvedValue(undefined);
    await rejects404(call(endpoint), 'Jam not found');
  });

  it('streams/GET: unknown eventId and missing stream each throw a 404', async () => {
    vi.mocked(findJamEvent).mockResolvedValue(undefined);
    await rejects404(call(streamsGetEndpoint), 'Jam not found');

    vi.mocked(findJamEvent).mockResolvedValue(jamEvent);
    vi.mocked(findActiveRtmpStream).mockResolvedValue(undefined);
    await rejects404(call(streamsGetEndpoint), 'Stream not found');
  });

  it('recordings/stop/PUT: unknown eventId and missing recording each throw a 404', async () => {
    vi.mocked(findJamEvent).mockResolvedValue(undefined);
    await rejects404(call(recordingsStopEndpoint), 'Jam not found');

    vi.mocked(findJamEvent).mockResolvedValue(jamEvent);
    vi.mocked(stopRecording).mockResolvedValue(undefined);
    await rejects404(call(recordingsStopEndpoint), 'Recording not found');
  });
});

describe('followProfileHandler not-found paths return real 404s (#2000)', () => {
  it('unknown profile throws a 404', async () => {
    vi.mocked(findProfile).mockResolvedValue(undefined);
    await rejects404(
      followProfileHandler({ profileId: 'ghost' }, emptyEvent),
      'profile with id ghost not found',
    );
  });

  it('blocked pair throws a 404', async () => {
    vi.mocked(findProfile).mockResolvedValue({ id: 'them' } as never);
    vi.mocked(isBlockedPair).mockImplementation(
      (_me: unknown, otherId: unknown) => otherId === 'them',
    );
    await rejects404(
      followProfileHandler({ profileId: 'them' }, emptyEvent),
      'profile with id them not found',
    );
  });
});

describe('unfollowProfileHandler not-found paths return real 404s (#2000)', () => {
  it('unknown profile throws a 404', async () => {
    vi.mocked(findProfile).mockResolvedValue(undefined);
    await rejects404(
      unfollowProfileHandler({ profileId: 'ghost' }, emptyEvent),
      'profile with id ghost not found',
    );
  });
});
