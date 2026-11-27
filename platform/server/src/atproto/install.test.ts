import type { Profile } from '@openpeepshq/common/types';
import { describe, expect, it, vi } from 'vitest';

// Pins the profile re-projection boundary (round-13 review suggestion 2):
// installAtproto re-projects the AT profile on profileCreated and on
// profileSettingsUpdated only. A bare `updateProfile` displayName change
// emits no hub event, so the projected AT record keeps the stale display
// name until some other settings write emits profileSettingsUpdated. This
// suite documents that boundary so a follow-up either closes it or keeps it
// explicit.
//
// `profileCreated` projects through the top-level `projectProfile` import
// (synchronous call inside the handler); `profileSettingsUpdated` re-reads
// the profile by id via a dynamic `import('@openpeepshq/core/profiles')`
// before re-projecting, so that side is asserted by polling the
// fire-and-forget promise chain.
vi.mock('@openpeepshq/core/atproto', () => ({
  atprotoIsActive: vi.fn(async () => true),
  isDesignatedLike: vi.fn(() => false),
  projectFollow: vi.fn(),
  projectLike: vi.fn(),
  projectProfile: vi.fn(async () => null),
  projectPublicNote: vi.fn(),
}));
vi.mock('@openpeepshq/core/events', () => ({ hub: { on: vi.fn() } }));
vi.mock('@openpeepshq/core/log', () => ({
  logger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));
// install.ts only destructures `findProfile` from this dynamic import.
vi.mock('@openpeepshq/core/profiles', () => ({ findProfile: vi.fn() }));
vi.mock('../atproto/wellKnown', () => ({ mountWellKnown: vi.fn() }));
vi.mock('../atproto/xrpc', () => ({ atprotoXrpcRouter: vi.fn() }));
vi.mock('../atproto/subscribe', () => ({ attachSubscribeRepos: vi.fn() }));

import { projectProfile } from '@openpeepshq/core/atproto';
import { findProfile } from '@openpeepshq/core/profiles';
import { hub } from '@openpeepshq/core/events';
import { installAtproto } from './install';

const listenerFor = (event: string) =>
  vi.mocked(hub.on).mock.calls.find(([name]) => name === event)?.[1] as
    | ((...args: unknown[]) => void)
    | undefined;

const makeApp = () => ({ use: vi.fn() }) as never;

const profileWith = (displayName: string): Profile =>
  ({ id: 'p1', handle: 'alice', displayName }) as Profile;

// The settingsUpdated listener is fire-and-forget; poll until `fn` stops
// throwing so we can assert on the async promise-chain output.
const pollUntil = async (fn: () => void, timeoutMs = 2000, intervalMs = 5) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      fn();
      return;
    } catch (err) {
      if (Date.now() > deadline) throw err;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
};

describe('installAtproto profile re-projection', () => {
  it('projects on profileCreated and re-projects on profileSettingsUpdated; a displayName-only updateProfile emits nothing', async () => {
    const on = vi.mocked(hub.on);
    on.mockClear();

    const teardown = await installAtproto(makeApp());
    expect(teardown).toBeDefined();

    // Coverage: both profile events have listeners...
    expect(listenerFor('profileCreated')).toBeDefined();
    expect(listenerFor('profileSettingsUpdated')).toBeDefined();
    // ...and the displayName write path has none — that is the boundary.
    const subscribed = on.mock.calls.map(([name]) => name);
    expect(subscribed).not.toContain('profileUpdated');

    // profileCreated: the captured profile is projected as-is (the initial
    // projection — displayName is correct here because it is set at create).
    vi.mocked(projectProfile).mockClear();
    const created = profileWith('Alicia');
    listenerFor('profileCreated')!(created);
    expect(projectProfile).toHaveBeenCalledWith(created);

    // profileSettingsUpdated: the listener re-reads the profile by id and
    // re-projects it, so a later settings write carries the fresh name.
    vi.mocked(projectProfile).mockClear();
    vi.mocked(findProfile).mockClear();
    const renamed = profileWith('Alicia (renamed)');
    vi.mocked(findProfile).mockResolvedValue(renamed as never);
    listenerFor('profileSettingsUpdated')!('p1');
    await pollUntil(() => expect(findProfile).toHaveBeenCalledWith('p1'));
    await pollUntil(() => expect(projectProfile).toHaveBeenCalledWith(renamed));
  });
});
