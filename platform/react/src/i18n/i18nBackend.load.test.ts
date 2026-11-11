import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initI18N } from './index';

// Real shipped locale fixtures, so the smoke test asserts on actual copy
// rather than a throwaway stub. They live in the sibling @openpeepshq/i18n
// package's source (this package consumes them at runtime via the /i18n
// endpoint, but the byte-for-byte content is the same resource).
const localesDir = resolve(__dirname, '../../../i18n/src/locales');
const en = JSON.parse(readFileSync(resolve(localesDir, 'en.json'), 'utf8')) as {
  auth: { register: { welcome: string } };
};
const de = JSON.parse(readFileSync(resolve(localesDir, 'de.json'), 'utf8')) as {
  auth: { register: { welcome: string } };
};

describe('i18next-http-backend 3.x runtime load (smoke)', () => {
  const baseUrl = 'http://localhost:4173';
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('loads a non-English bundle through the backend via the /i18n/{{lng}} loadPath', async () => {
    const requested: string[] = [];
    vi.stubGlobal(
      'fetch',
      async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input);
        requested.push(url);
        const body = url.includes('/i18n/de') ? de : en;
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    );

    // initI18N resolves only after the http backend has loaded the initial
    // bundle, so awaiting it proves the 3.0.6 backend fetch path ran.
    const i18n = await initI18N('de', baseUrl);

    expect(requested).toContain(`${baseUrl}/api/openpeeps/core/v1/i18n/de`);
    expect(i18n.t('auth.register.welcome')).toBe('Willkommen');
  });

  it('loads the English bundle the same way', async () => {
    const requested: string[] = [];
    vi.stubGlobal(
      'fetch',
      async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input);
        requested.push(url);
        const body = url.includes('/i18n/en') ? en : de;
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    );

    const i18n = await initI18N('en', baseUrl);

    expect(requested).toContain(`${baseUrl}/api/openpeeps/core/v1/i18n/en`);
    expect(i18n.t('auth.register.welcome')).toBe('Welcome');
  });
});
