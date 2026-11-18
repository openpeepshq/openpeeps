import { describe, expect, it } from 'vitest';
import { requireGuestCapableProfile } from '#lib/auth';
import { authNeeded } from '#lib/errors';

// `requireGuestCapableProfile` is a thin gate, so we can test it directly
// with a shaped RequestEvent instead of spinning up the whole middleware
// stack (which is what the existing #lib tests avoid).

const asEvent = (context: Record<string, unknown>) =>
  ({ context }) as unknown as Parameters<typeof requireGuestCapableProfile>[0];

const localProfile = { id: 'p1', type: 'local', memberships: [] };
const guestProfile = { id: 'g1', type: 'guest', memberships: [] };
const resource = { type: 'jams', id: 'ev1' } as const;

describe('requireGuestCapableProfile', () => {
  it('accepts a signed-in local profile without any scope', async () => {
    const event = asEvent({ currentProfile: localProfile });
    await expect(requireGuestCapableProfile(event, resource)).resolves.toBe(
      localProfile,
    );
  });

  it('accepts a guest whose authorization scopes cover the jam', async () => {
    const event = asEvent({
      currentProfile: guestProfile,
      authorization: {
        scopes: [{ resource: { type: 'jams', id: 'ev1' }, scopeLevel: 'read' }],
      },
    });
    await expect(requireGuestCapableProfile(event, resource)).resolves.toBe(
      guestProfile,
    );
  });

  it('rejects a guest with no authorization scopes', async () => {
    const event = asEvent({ currentProfile: guestProfile });
    await expect(
      requireGuestCapableProfile(event, resource),
    ).rejects.toMatchObject({
      status: 401,
      key: 'error.jamGuestPassRequired',
    });
  });

  it('rejects a guest whose scopes cover a different resource', async () => {
    const event = asEvent({
      currentProfile: guestProfile,
      authorization: {
        scopes: [
          { resource: { type: 'jams', id: 'other' }, scopeLevel: 'read' },
        ],
      },
    });
    await expect(
      requireGuestCapableProfile(event, resource),
    ).rejects.toMatchObject({
      status: 401,
      key: 'error.jamGuestPassRequired',
    });
  });

  it('rejects a signed-out request and carries the i18n key on the error', async () => {
    const event = asEvent({ currentProfile: undefined });
    await expect(
      requireGuestCapableProfile(event, resource),
    ).rejects.toMatchObject({
      status: 401,
      key: 'error.jamGuestPassRequired',
    });
    // The thrown object is the exact authNeeded() factory output, so its
    // `key` is what Riddl serialises into the 401 body and what the SSE
    // client later reads to look up a user-facing message.
    const err = await requireGuestCapableProfile(event, resource).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe(
      'A guest pass is required to join this jam',
    );
    expect(authNeeded('x').status).toBe(401);
  });
});
