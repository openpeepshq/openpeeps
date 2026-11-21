/**
 * Pins the search/mention boundary the #211 directory opt-out documents.
 *
 * `profileSearchMapping` intentionally stays unfiltered by the opt-out:
 * opted-out (discoverable: false) profiles remain findable via search/Explore
 * and mention autocomplete — only the member directory and the SEO sitemap
 * hide them. The directory callers are pinned (finders.test.ts,
 * seo/index.test.ts), but nothing pins that the search mapping does NOT gain
 * the opt-out filter. A future "privacy fix" adding
 * `profileFilters.discoverable()` (or any other filter) here would land with
 * no test failing, silently narrowing the agreed scope. These assertions
 * mirror the SEO call-site pin and fail on exactly that change.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileWithMeta } from '@openpeepshq/common/types';

const filters = vi.hoisted(() => ({
  notGuest: vi.fn(() => ({ kind: 'sql', where: 'not-guest' })),
  notIdIn: vi.fn((ids: string[]) =>
    ids.length ? { kind: 'sql', where: 'not-id-in' } : undefined,
  ),
  // Exposed deliberately: a discoverable() added to the search mapping is
  // caught by the explicit "never filters by discoverable" assertion,
  // instead of crashing the suite on a missing mock export.
  discoverable: vi.fn(() => ({ kind: 'sql', where: 'discoverable' })),
}));

const mapping = vi.hoisted(() => {
  const chain: {
    filter: ReturnType<typeof vi.fn>;
    fulltextSearch: ReturnType<typeof vi.fn>;
  } = { filter: vi.fn(), fulltextSearch: vi.fn() };
  // filter() returns the chain itself, as the real mapping builder does.
  chain.filter.mockImplementation(() => chain);
  return chain;
});

vi.mock('@openpeepshq/common/lib', () => ({
  // Real implementation (block-pair ids only); the test viewer has none.
  blockedPairIds: (profile?: {
    blockingIds?: string[] | null;
    blockedByIds?: string[] | null;
  }) => [
    ...new Set([
      ...(profile?.blockingIds ?? []),
      ...(profile?.blockedByIds ?? []),
    ]),
  ],
}));

vi.mock('../groups', () => ({ groupsMapping: {} }));
vi.mock('../groups/helpers', () => ({ canSeeGroupFilter: vi.fn() }));
vi.mock('../profiles/mapping', () => ({
  publicProfilesSearchMapping: mapping,
}));
vi.mock('../posts/finders', () => ({ baseListPosts: vi.fn() }));
vi.mock('../db/pg/filters', () => ({
  postFilters: { notDirect: vi.fn(), hasJam: vi.fn() },
  profileFilters: {
    notGuest: filters.notGuest,
    notIdIn: filters.notIdIn,
    discoverable: filters.discoverable,
  },
}));

import { profileSearchMapping } from './mapping';

const member = { id: 'p-viewer' } as ProfileWithMeta;

describe('profileSearchMapping (search/mention boundary, issue #211 S1)', () => {
  beforeEach(() => {
    filters.notGuest.mockClear();
    filters.notIdIn.mockClear();
    filters.discoverable.mockClear();
    mapping.filter.mockClear();
    mapping.fulltextSearch.mockClear();
  });

  it('never applies the directory opt-out filter — opted-out profiles stay findable', () => {
    profileSearchMapping(member, 'peep');
    expect(filters.discoverable).not.toHaveBeenCalled();
  });

  it('keeps exactly the guest + block-pair filters, no others', () => {
    profileSearchMapping(member, 'peep');
    expect(filters.notGuest).toHaveBeenCalledTimes(1);
    expect(filters.notIdIn).toHaveBeenCalledTimes(1);
    // Two filter calls in total: notGuest, then the blocked-pair guard
    // (undefined for a viewer without blocks). A third .filter() call —
    // any filter, discoverable included — would fail this count.
    expect(mapping.filter).toHaveBeenCalledTimes(2);
  });

  it('searches the public profile view with the query, unchanged', () => {
    profileSearchMapping(member, 'peep');
    expect(mapping.fulltextSearch).toHaveBeenCalledTimes(1);
    expect(mapping.fulltextSearch).toHaveBeenCalledWith(
      expect.objectContaining({ view: 'profileSearch', query: 'peep' }),
    );
  });
});
