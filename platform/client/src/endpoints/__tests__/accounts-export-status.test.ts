import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openpeepsClient } from '../../index';

// The status route the hook polls is a pass-through of the server's
// `GET /api/openpeeps/core/v1/accounts/current/export/status?jobId=…`
// (platform/server/src/api/.../export/status/GET.ts). The server maps a stored
// export record onto `{ state, downloadToken, expiresAt, … }` and the client
// hands that object back verbatim. This route-level test pins the full
// route → hook contract — the exact URL the client hits (including the `jobId`
// query param the status endpoint authenticates against) and the server payload
// passing through unchanged — not just the mapping in isolation.
const API_BASE = 'https://example.org/api/openpeeps/core/v1';
const JOB = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0000';

const jsonResponse = (body: unknown) =>
  ({
    ok: true,
    json: async () => body,
  }) as unknown as Response;

describe('accounts.current.export.status route → hook pass-through', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hits the status route with the jobId query param and passes the ready payload through', async () => {
    const ready = {
      jobId: JOB,
      state: 'ready',
      downloadToken: 'tok-123',
      expiresAt: '2026-01-08T00:00:00.000Z',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(ready));

    const client = openpeepsClient({ baseUrl: 'https://example.org' });
    const res = await client.accounts.current.export.status({
      queryParameters: { jobId: JOB },
    });

    // The client must hit the real server route, with the jobId the status
    // endpoint scopes the record to.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE}/accounts/current/export/status?jobId=${JOB}`);
    expect(init.method).toBe('GET');

    // And the server payload (token + expiry included) is passed through, not
    // reshaped.
    expect(res).toEqual({ data: ready });
  });

  it('passes a non-ready state through without fabricating a token', async () => {
    const building = { jobId: JOB, state: 'building' };
    fetchMock.mockResolvedValueOnce(jsonResponse(building));

    const client = openpeepsClient({ baseUrl: 'https://example.org' });
    const res = await client.accounts.current.export.status({
      queryParameters: { jobId: JOB },
    });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${API_BASE}/accounts/current/export/status?jobId=${JOB}`);
    expect(res).toEqual({ data: building });
    // The hook keys off `downloadToken` to stop polling — a building record
    // must carry none, or the client would treat it as ready.
    expect(
      (res as { data: { downloadToken?: string } }).data.downloadToken,
    ).toBeUndefined();
  });
});
