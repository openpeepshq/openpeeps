import { describe, expect, it } from 'vitest';
import {
  ARTICLE_SLUG_MAX_LENGTH,
  articleSlugPattern,
  generateArticleSlug,
  isHandleShapedSlug,
  isValidArticleSlug,
} from './articleSlug';
import { handleRegexBase } from '../types/forbiddenHandles';

describe('articleSlug invariants', () => {
  it('accepts lowercase-alnum runs separated by single hyphens', () => {
    for (const slug of ['my-post', 'a', '123', 'a-b-c', 'post-2']) {
      expect(isValidArticleSlug(slug), slug).toBe(true);
    }
  });

  it('rejects empty, over-length, and off-pattern slugs', () => {
    expect(isValidArticleSlug('')).toBe(false);
    expect(isValidArticleSlug('a'.repeat(ARTICLE_SLUG_MAX_LENGTH + 1))).toBe(
      false,
    );
    for (const slug of [
      'My-Post', // uppercase
      'my_post', // underscore
      '-lead', // leading hyphen
      'trail-', // trailing hyphen
      'double--hyphen', // consecutive hyphens
    ]) {
      expect(isValidArticleSlug(slug), slug).toBe(false);
    }
  });

  it('keeps the handle-shape guard in lockstep with handleRegexBase', () => {
    // The guard is built from `handleRegexBase` (shared with the handle rules),
    // so a future handle-rule change cannot silently desynchronize the slug
    // collision guard. Pin the current shape explicitly too.
    const fromBase = new RegExp(`^${handleRegexBase}$`);
    for (const value of [
      'alice',
      'a_b-c9',
      'x'.repeat(16),
      'hello-world',
      '',
    ]) {
      expect(isHandleShapedSlug(value), value).toBe(fromBase.test(value));
    }
    expect(isHandleShapedSlug('a'.repeat(17))).toBe(false);
    expect(articleSlugPattern.test('my-post')).toBe(true);
  });

  it('gives up (null) after the bounded `-N` suffix loop (cap of 100)', async () => {
    let calls = 0;
    const isTaken = async () => {
      calls++;
      return true;
    };
    await expect(generateArticleSlug('x', isTaken)).resolves.toBeNull();
    expect(calls).toBe(100);
  });

  it('trims the base so a suffix on a max-length slug stays within the cap', async () => {
    const base = 'a'.repeat(ARTICLE_SLUG_MAX_LENGTH); // 100-char title
    // Only the base itself is taken; the trimmed candidate must be free.
    const isTaken = async (slug: string) => slug === base;
    const slug = await generateArticleSlug(base, isTaken);
    expect(slug).toBe(`${'a'.repeat(ARTICLE_SLUG_MAX_LENGTH - 2)}-2`);
    expect(slug!.length).toBe(ARTICLE_SLUG_MAX_LENGTH);
    expect(isValidArticleSlug(slug!)).toBe(true);
  });

  it('returns null when the title slugifies to nothing', async () => {
    await expect(generateArticleSlug('!!!', () => false)).resolves.toBeNull();
  });
});
