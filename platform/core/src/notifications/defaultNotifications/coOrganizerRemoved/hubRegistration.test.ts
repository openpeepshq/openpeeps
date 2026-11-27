import { beforeEach, describe, expect, it, vi } from 'vitest';

// Capture how the module registers its `postUpdated` listener. The bug this
// guards: a `hub.once('postUpdated', …)` registration fires the handler once
// (on the first `postUpdated` after startup) and then unregisters itself, so
// co-organizer change notifications would stop working after that first edit.
// The handler must be registered with `hub.on` (a persistent subscriber).
//
// `vi.hoisted` is required because `vi.mock` factories are hoisted above the
// `const` declarations in this file — referencing them directly hits the
// temporal dead zone when `./index` registers its listeners at import time.
const { onCalls, onceCalls } = vi.hoisted(() => ({
  onCalls: [] as Array<{
    event: string;
    handler: (...args: unknown[]) => unknown;
  }>,
  onceCalls: [] as Array<{
    event: string;
    handler: (...args: unknown[]) => unknown;
  }>,
}));

vi.mock('../../../events', () => ({
  hub: {
    on: (event: string, handler: (...args: unknown[]) => unknown) => {
      onCalls.push({ event, handler });
      return () => {
        onCalls.pop();
      };
    },
    once: (event: string, handler: (...args: unknown[]) => unknown) => {
      onceCalls.push({ event, handler });
    },
  },
}));
vi.mock('@openpeepshq/core/notifications', () => ({
  maybeCreateNotification: vi.fn(async () => undefined),
}));
vi.mock('@openpeepshq/core/profiles', () => ({
  // Return a real profile so the handler's notify path actually fires.
  findProfile: vi.fn(async (id: string) => ({ id })),
}));
vi.mock('../../../i18n', () => ({
  initI18nEmailContext: vi.fn(async () => ({
    i18n: {},
    t: (key: string) => key,
  })),
}));

import coOrganizerRemoved from './index';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import { hub } from '../../../events';

describe('coOrganizerRemoved `postUpdated` registration', () => {
  beforeEach(() => {
    vi.mocked(maybeCreateNotification).mockClear();
  });

  it('registers `postUpdated` with the persistent `hub.on`, not `hub.once`', () => {
    expect(onceCalls).toEqual([]);
    const postUpdated = onCalls.find((c) => c.event === 'postUpdated');
    expect(
      postUpdated,
      'postUpdated should be registered via hub.on',
    ).toBeDefined();
  });

  it('notifies on every `postUpdated` removal, not just the first', async () => {
    const postUpdated = onCalls.find((c) => c.event === 'postUpdated')!;
    const handler = postUpdated.handler as (
      post: unknown,
      prevJam: unknown,
      prevCoOrganizers: unknown,
    ) => Promise<unknown>;
    const eventPost = (coOrganizers: string[]) => ({
      id: 'post-1',
      profile: { id: 'organizer' },
      data: { type: 'event', coOrganizers },
    });

    // First update: drop "co-a" (was ["co-a", "co-b"]).
    await handler(eventPost(['co-b']), [], ['co-a', 'co-b']);
    // Second update: drop "co-b" (was ["co-b"]). A `hub.once` handler would
    // have already unsubscribed and never seen this emission.
    await handler(eventPost([]), [], ['co-b']);

    expect(maybeCreateNotification).toHaveBeenCalledTimes(2);
    expect(maybeCreateNotification).toHaveBeenNthCalledWith(
      1,
      { id: 'co-a' },
      {
        type: 'coOrganizerRemoved',
        fromProfileId: 'organizer',
        postId: 'post-1',
      },
    );
    expect(maybeCreateNotification).toHaveBeenNthCalledWith(
      2,
      { id: 'co-b' },
      {
        type: 'coOrganizerRemoved',
        fromProfileId: 'organizer',
        postId: 'post-1',
      },
    );

    expect(coOrganizerRemoved.type).toBe('coOrganizerRemoved');
  });
});
