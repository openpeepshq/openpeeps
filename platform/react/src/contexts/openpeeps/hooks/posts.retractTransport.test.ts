/**
 * Pins the reaction-retraction client contract (issue #276, round-15 review
 * item #1).
 *
 * Riddl's `parseBody` returns `{}` for DELETE, so the retraction emoji must
 * travel as a `?reaction=` query parameter — a DELETE body is silently dropped
 * on the wire (which previously made every retraction fall back to the legacy
 * 👍). This test drives the real `openpeepsClient` `retractReaction` endpoint
 * through the fetch client's URL construction, so the no-payload endpoint
 * declaration in `@openpeepshq/client` and the server's query-param contract
 * cannot drift apart without a CI-visible failure.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openpeepsClient } from '@openpeepshq/client';
import type { SuccessResponse } from '@openpeepshq/common';

const RETRACT = '/posts/post-1/react';

describe('retractReaction endpoint (client DELETE query contract)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const runEndpoint = async (
    reaction?: string,
  ): Promise<{ url: string; init?: RequestInit }> => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true }) as SuccessResponse,
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { retractReaction } = openpeepsClient().posts;
    await retractReaction({
      pathParameters: { id: 'post-1' },
      queryParameters: reaction ? { reaction } : undefined,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return { url, init };
  };

  it('sends a bodyless DELETE carrying the reaction as a query parameter', async () => {
    const { url, init } = await runEndpoint('😂');
    // URLSearchParams percent-encodes the emoji; the server's Query schema
    // decodes it back. The retraction must ride the query string, not a body.
    expect(
      url.endsWith(`${RETRACT}?reaction=${encodeURIComponent('😂')}`),
    ).toBe(true);
    expect(init?.body).toBeUndefined();
    expect(init?.method).toBe('DELETE');
  });

  it('sends a bodyless DELETE with no query string for the legacy 👍 retract', async () => {
    const { url, init } = await runEndpoint();
    // No reaction: the server's handler `?? AP_LIKE_REACTION` fallback retracts
    // the legacy like, so the client must not send a `reaction` query param.
    expect(url.endsWith(RETRACT)).toBe(true);
    expect(url).not.toContain('?');
    expect(init?.body).toBeUndefined();
    expect(init?.method).toBe('DELETE');
  });
});
