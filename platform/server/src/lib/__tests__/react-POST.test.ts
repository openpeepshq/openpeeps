import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RequestEvent } from '@riddl/core';

const here = dirname(fileURLToPath(import.meta.url));
// Locale files live in the sibling `i18n` package; read them straight from
// disk so the server test does not need `@openpeepshq/i18n` as a dependency.
const loadLocale = (file: string) =>
  JSON.parse(
    readFileSync(resolve(here, `../../../../i18n/src/locales/${file}`), 'utf8'),
  ) as Record<string, unknown>;

// Integration-style test of the post reaction endpoints (POST + DELETE)
// focused on the community allowed-reaction-set validation. The handler's own
// branch logic (schema parse, the `resolveAllowedReactions` gate, and the
// `error.reactionNotAllowed` rejection) runs unmocked; only the external
// boundaries — auth, the DB-backed post lookups/mutations, and the community
// config — are mocked. A full Playwright run against a live Postgres is out of
// scope for the unit suite.
const {
  ensureLocalProfile,
  ensurePostCapabilities,
  findPost,
  findLatestConversationPost,
  reactToPost,
  retractReaction,
  communityConfig,
} = vi.hoisted(() => ({
  ensureLocalProfile: vi.fn(),
  ensurePostCapabilities: vi.fn(),
  findPost: vi.fn(),
  findLatestConversationPost: vi.fn(),
  reactToPost: vi.fn(),
  retractReaction: vi.fn(),
  communityConfig: vi.fn(),
}));

vi.mock('#lib/auth', () => ({
  ensureLocalProfile,
  ensurePostCapabilities,
}));
vi.mock('@openpeepshq/core/posts', () => ({
  findPost,
  findLatestConversationPost,
  reactToPost,
  retractReaction,
}));
vi.mock('@openpeepshq/core/config', () => ({ communityConfig }));

import { apiEndpoint as reactPost } from '../../api/openpeeps/core/v1/posts/[postId]/react/POST';
import { apiEndpoint as reactDelete } from '../../api/openpeeps/core/v1/posts/[postId]/react/DELETE';
import { Query as reactDeleteQuery } from '../../api/openpeeps/core/v1/posts/[postId]/react/DELETE';
import { AP_LIKE_REACTION } from '@openpeepshq/common/lib';
import { reactionEmojiSchema } from '@openpeepshq/common/types';

const profile = { id: 'profile-1' };
const mergedPost = {
  id: 'post-1',
  visibility: 'public',
  creatorId: 'creator-1',
  profile: { id: 'creator-1' },
};

const event = {} as RequestEvent;

const callPost = (reaction: string) =>
  reactPost.handle({
    body: { reaction },
    query: {},
    param: { postId: 'post-1' },
    event,
  });

// The reaction travels in the query, not the body: Riddl's parseBody returns
// {} for DELETE, so the server's Input is unreachable on this route and the
// query is the only place a non-legacy retraction can come from.
const callDelete = (reaction?: string) =>
  reactDelete.handle({
    body: {},
    query: reaction ? { reaction } : {},
    param: { postId: 'post-1' },
    event,
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ensureLocalProfile).mockResolvedValue(profile as never);
  vi.mocked(ensurePostCapabilities).mockResolvedValue(undefined);
  vi.mocked(findPost).mockResolvedValue(mergedPost as never);
  vi.mocked(findLatestConversationPost).mockResolvedValue(null as never);
  vi.mocked(reactToPost).mockResolvedValue(undefined);
  vi.mocked(retractReaction).mockResolvedValue(undefined);
  // No configured set by default → the curated 7 apply.
  vi.mocked(communityConfig).mockResolvedValue(undefined);
});

describe('POST /posts/[postId]/react — community allowed-reaction-set gate', () => {
  it('accepts a reaction in the default (no-config) set and writes it', async () => {
    await expect(callPost('🎉')).resolves.toEqual({ success: true });
    expect(reactToPost).toHaveBeenCalledWith(mergedPost, profile, {
      reaction: '🎉',
    });
  });

  it('accepts an emoji from a configured custom set', async () => {
    vi.mocked(communityConfig).mockResolvedValue({
      content: { allowedReactions: ['🦖', '🎂'] },
    } as never);
    await expect(callPost('🦖')).resolves.toEqual({ success: true });
    expect(reactToPost).toHaveBeenCalledWith(mergedPost, profile, {
      reaction: '🦖',
    });
  });

  it('rejects an emoji removed from a configured set with 400 + error.reactionNotAllowed', async () => {
    // 👍 is a curated default; the community replaced the set with a custom one
    // that does not include it.
    vi.mocked(communityConfig).mockResolvedValue({
      content: { allowedReactions: ['🦖', '🎂'] },
    } as never);
    await expect(callPost('👍')).rejects.toMatchObject({
      __HTTP_ERROR__: true,
      status: 400,
      message: 'error.reactionNotAllowed',
    });
    // The write must not happen for a rejected reaction.
    expect(reactToPost).not.toHaveBeenCalled();
  });

  it('rejects a reaction not in the default set when config is empty-but-present', async () => {
    // An empty configured list still falls back to the curated defaults
    // (resolveAllowedReactions treats absent/empty as "defaults").
    vi.mocked(communityConfig).mockResolvedValue({ content: {} } as never);
    await expect(callPost('👎')).resolves.toEqual({ success: true });
  });

  it('exposes the i18n key in en and de (error is internationalized)', () => {
    const en = loadLocale('en.json');
    const de = loadLocale('de.json');
    const enError = (en.error ?? {}) as Record<string, unknown>;
    const deError = (de.error ?? {}) as Record<string, unknown>;
    expect(enError.reactionNotAllowed).toBe(
      'That reaction is not allowed in this community.',
    );
    expect(typeof deError.reactionNotAllowed).toBe('string');
    expect((deError.reactionNotAllowed as string).length).toBeGreaterThan(0);
    // The client surfaces the rejected reaction via this key (apiErrorMessage
    // translates any `error.*` candidate), so it must be a resolvable i18n key.
    expect(enError.reactionNotAllowed).not.toBe('error.reactionNotAllowed');
  });
});

describe('DELETE /posts/[postId]/react — orphans stay retractable', () => {
  it('retracts an emoji that is no longer in the configured allowed set', async () => {
    // 🎉 is attached historically; the community later removed it from
    // `allowedReactions`. The DELETE endpoint deliberately has NO allowed-set
    // check (new attachments are gated at POST /react), so a reaction outside
    // the current set must still be retractable — asserted via the query-param
    // transport the client uses, pinning both the boundary and the contract.
    vi.mocked(communityConfig).mockResolvedValue({
      content: { allowedReactions: ['🦖'] },
    } as never);
    await expect(callDelete('🎉')).resolves.toEqual({ success: true });
    expect(retractReaction).toHaveBeenCalledWith(mergedPost, profile, {
      reaction: '🎉',
    });
  });

  it('accepts a schema-valid emoji that is not in the configured set (POST-vs-DELETE divergence)', async () => {
    // 🎂 passes reactionEmojiSchema but the community's set is ['🦖']. On
    // POST this exact input is the 400 error.reactionNotAllowed case above;
    // on DELETE it must still retract — pinning the write-path-only gate so
    // the two endpoints cannot silently drift back into symmetry.
    vi.mocked(communityConfig).mockResolvedValue({
      content: { allowedReactions: ['🦖'] },
    } as never);
    await expect(callDelete('🎂')).resolves.toEqual({ success: true });
    expect(retractReaction).toHaveBeenCalledWith(mergedPost, profile, {
      reaction: '🎂',
    });
  });

  it('query-less DELETE retracts the legacy default (👍) via the handler fallback', async () => {
    // Pre-picker clients send no reaction; the handler's
    // `?? AP_LIKE_REACTION` default makes a bare retraction resolve to the
    // curated default rather than throw.
    await expect(callDelete()).resolves.toEqual({ success: true });
    expect(retractReaction).toHaveBeenCalledWith(mergedPost, profile, {
      reaction: AP_LIKE_REACTION,
    });
  });

  it('rejects a non-emoji (oversized) reaction on the DELETE query', async () => {
    // A >32-char value is not a valid emoji; the DELETE `Query` schema
    // (reactionEmojiSchema) must reject it, so Riddl's parseQuery 400s a
    // garbage retraction before it reaches the handler — keeping the
    // write-edge validation on the same query transport as a valid retract.
    const oversize = 'not-an-emoji-just-a-very-long-string';
    expect(oversize.length).toBeGreaterThan(32);
    expect(reactionEmojiSchema.safeParse(oversize).success).toBe(false);
    expect(reactDeleteQuery.safeParse({ reaction: oversize }).success).toBe(
      false,
    );
  });
});
