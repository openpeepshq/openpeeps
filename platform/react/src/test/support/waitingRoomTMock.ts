import type { TFunction } from 'i18next';

// en.json values for the keys the waiting-room tests drive. Inlined (same as
// the repo's other mocks, which mirror en.json) so the tests stay independent
// of the locale files loading. `error.jamGuestPassRequired` is the key the
// source hands to the resolver bare — real i18next resolves it to this value.
const knownKeys: Record<string, string> = {
  'jams.waitingRoom.admitSuccess': 'Participant admitted successfully',
  'jams.waitingRoom.admitError': 'Failed to admit participant',
  'jams.waitingRoom.rejectSuccess': 'Participant rejected successfully',
  'jams.waitingRoom.rejectError': 'Failed to reject participant',
  'jams.waitingRoom.streamError': 'Unable to reach the waiting room',
  'error.jamGuestPassRequired':
    'Sign in, or create a guest pass, to join this jam.',
};

// Shared t() mock for the waiting-room test suites (one mock for all of them
// so they cannot drift apart). It mirrors how the source calls `t`: the
// stream hooks resolve `jams.waitingRoom.streamError` through the resolver
// (a non-empty fallback), and hand bare `error.*` keys to the resolver with
// no defaultValue — so the mock resolves known keys the way real i18next
// would and passes unknown keys through raw. A regression to a bare `t(key)`
// for the fallback would surface the raw key instead of the copy.
export const waitingRoomTMock: TFunction = ((
  key: string,
  opts?: { count?: number; defaultValue?: string },
) => {
  const resolved = knownKeys[key] ?? opts?.defaultValue ?? key;
  return opts?.count !== undefined ? `${resolved}:${opts.count}` : resolved;
}) as TFunction;
