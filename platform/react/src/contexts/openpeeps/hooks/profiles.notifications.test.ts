/**
 * Pins the `excludeTypes` client contract (issue #354, round-8 suggestion 3).
 *
 * The feed `GET` and the mark-all-seen `PUT` share `excludeTypesQuerySchema`
 * (`@openpeepshq/common`). This test drives the real `openpeepsClient`
 * `markAllNotificationsAsSeen` endpoint through the fetch client's URL
 * construction, so the query-param type declared in `@openpeepshq/client` and
 * the schema's comma-joined-string contract cannot drift apart without a
 * CI-visible failure.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openpeepsClient } from '@openpeepshq/client';
import type { SuccessResponse } from '@openpeepshq/common';

const MARK_ALL_SEEN = '/profiles/current/notifications/mark-all-seen';

describe('markAllNotificationsAsSeen endpoint (client query contract)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const runEndpoint = async (queryParameters?: {
    excludeTypes?: string;
  }): Promise<string> => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true }) as SuccessResponse,
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { markAllNotificationsAsSeen } = openpeepsClient().profiles.current;
    await markAllNotificationsAsSeen({ queryParameters });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    return fetchMock.mock.calls[0]?.[0] as string;
  };

  it('serializes excludeTypes as a URL query parameter', async () => {
    const url = await runEndpoint({ excludeTypes: 'repost,poll_vote' });
    // URLSearchParams encodes the comma; the server's schema splits it back.
    expect(
      url.endsWith(`${MARK_ALL_SEEN}?excludeTypes=repost%2Cpoll_vote`),
    ).toBe(true);
  });

  it('omits the query string when excludeTypes is not provided', async () => {
    const url = await runEndpoint();
    expect(url.endsWith(MARK_ALL_SEEN)).toBe(true);
    expect(url).not.toContain('?');
  });
});
