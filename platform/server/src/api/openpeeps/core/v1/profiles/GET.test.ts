import { describe, expect, it, vi } from 'vitest';

const { listProfiles, ensureProfileOrPublicCommunity } = vi.hoisted(() => ({
  listProfiles: vi.fn(async () => []),
  ensureProfileOrPublicCommunity: vi.fn(
    async (): Promise<unknown> => undefined,
  ),
}));

vi.mock('@openpeepshq/core/profiles', () => ({ listProfiles }));
vi.mock('#lib/auth', () => ({ ensureProfileOrPublicCommunity }));

import { Error, Query, apiEndpoint } from './GET';

const call = (query: Record<string, unknown>, event: unknown = {}) =>
  apiEndpoint.handle({ body: {}, query, param: {}, event });

describe('GET /profiles (member directory)', () => {
  it('Query only accepts the literal string "true" for directory', () => {
    expect(Query.safeParse({}).success).toBe(true);
    expect(Query.safeParse({ directory: 'true' }).success).toBe(true);
    expect(Query.safeParse({ directory: 'false' }).success).toBe(false);
    expect(Query.safeParse({ directory: 'TRUE' }).success).toBe(false);
    expect(Query.safeParse({ directory: 1 }).success).toBe(false);
  });

  it('Error declares a 403 for private communities', () => {
    expect(Error[403].status).toBe(403);
  });

  it('forwards directory=true to listProfiles as directoryView: true', async () => {
    await call({ directory: 'true' });
    expect(ensureProfileOrPublicCommunity).toHaveBeenCalledWith({});
    expect(listProfiles).toHaveBeenCalledWith(undefined, {
      directoryView: true,
    });
  });

  it('forwards an absent flag to listProfiles as directoryView: false', async () => {
    await call({});
    expect(listProfiles).toHaveBeenCalledWith(undefined, {
      directoryView: false,
    });
  });

  it('passes the resolved viewer profile through to listProfiles', async () => {
    const viewer = { id: 'p-1' };
    ensureProfileOrPublicCommunity.mockResolvedValueOnce(viewer);
    await call({ directory: 'true' });
    expect(listProfiles).toHaveBeenCalledWith(viewer, {
      directoryView: true,
    });
  });
});
