import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initI18N } from './index';

// Real shipped locale fixtures, so the assertion covers the key that actually
// ships (issue #1750): `resources.library.openCategory` is consumed by the
// ResourceCard category chip (web `title`, RN `accessibilityLabel`) and must
// resolve to a translated string in both locales, not degrade to the bare key.
const localesDir = resolve(__dirname, '../../../i18n/src/locales');
const en = JSON.parse(
  readFileSync(resolve(localesDir, 'en.json'), 'utf8'),
) as Record<string, unknown>;
const de = JSON.parse(
  readFileSync(resolve(localesDir, 'de.json'), 'utf8'),
) as Record<string, unknown>;

const serveBundles = async (input: RequestInfo | URL) => {
  const url = String(input);
  const body = url.includes('/i18n/de') ? de : en;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

describe('resources.library.openCategory is registered in both locales', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
  });

  it('resolves to a translated string (not the bare key) in en and de', async () => {
    vi.stubGlobal('fetch', serveBundles);

    const i18nEn = await initI18N('en', 'http://localhost:4173');
    const enValue = i18nEn.t('resources.library.openCategory', {
      name: 'Marketing',
    });
    expect(enValue).not.toBe('resources.library.openCategory');
    expect(enValue).toContain('Marketing');

    const i18nDe = await initI18N('de', 'http://localhost:4173');
    const deValue = i18nDe.t('resources.library.openCategory', {
      name: 'Marketing',
    });
    expect(deValue).not.toBe('resources.library.openCategory');
    expect(deValue).toContain('Marketing');
    // The two locales carry distinct copy, so a de bundle that accidentally
    // mirrors en (or falls back) is caught.
    expect(deValue).not.toBe(enValue);
  });

  it('is present in the shipped bundle shape consumed at runtime', () => {
    const pick = (bundle: Record<string, unknown>) =>
      (
        (bundle as Record<string, Record<string, Record<string, unknown>>>)[
          'resources'
        ] as Record<string, Record<string, unknown>>
      )['library'] as Record<string, unknown>;
    expect(typeof pick(en)['openCategory']).toBe('string');
    expect(typeof pick(de)['openCategory']).toBe('string');
  });
});
