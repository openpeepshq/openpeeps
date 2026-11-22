import { describe, expect, it } from 'vitest';
import { openpeepsClient } from '../../index';

// The one-time export download URL must match the server route
// `/api/openpeeps/core/v1/accounts/current/export/download`
// (platform/server/src/lib/accounts-export-download.ts). The client's base URL
// already carries the `/api/openpeeps/core/v1` prefix (added in index.ts), so
// the builder must stay relative to it — appending the prefix a second time
// doubled it and 404'd every download on both web and RN.
describe('accounts.current.export.downloadUrl', () => {
  it('resolves the server download route without a doubled prefix', async () => {
    const client = openpeepsClient({ baseUrl: 'https://example.org' });
    const url = await client.accounts.current.export.downloadUrl('tok-1');
    expect(url).toBe(
      'https://example.org/api/openpeeps/core/v1/accounts/current/export/download?token=tok-1',
    );
  });

  it('normalizes a trailing slash on the configured baseUrl', async () => {
    const client = openpeepsClient({ baseUrl: 'https://example.org/' });
    const url = await client.accounts.current.export.downloadUrl('tok-1');
    expect(url).toBe(
      'https://example.org/api/openpeeps/core/v1/accounts/current/export/download?token=tok-1',
    );
  });

  it('url-encodes the one-time token', async () => {
    const client = openpeepsClient({ baseUrl: 'https://example.org' });
    const url = await client.accounts.current.export.downloadUrl('a b/c?d=e&f');
    expect(url).toBe(
      'https://example.org/api/openpeeps/core/v1/accounts/current/export/download?token=a%20b%2Fc%3Fd%3De%26f',
    );
  });
});
