import { describe, expect, it } from 'vitest';

// Unit test for the admin community-config `allowedReactions` normalizer,
// now a pure function in `#lib/normalizeReactions` (no endpoint/DB/auth
// imports to mock).
import { normalizeAllowedReactions } from '../normalizeReactions';
import { badRequest } from '../errors';

const badRequestKey = (err: unknown) =>
  (err as { key?: string; message?: string })?.key ??
  (err as { message?: string })?.message;

describe('normalizeAllowedReactions', () => {
  it('trims whitespace around each emoji', () => {
    const config = { content: { allowedReactions: ['  👍  ', ' 🎉 '] } };
    normalizeAllowedReactions(config);
    expect(config.content.allowedReactions).toEqual(['👍', '🎉']);
  });

  it('drops whitespace-only (empty after trim) entries', () => {
    const config = { content: { allowedReactions: ['👍', '   ', '\t'] } };
    normalizeAllowedReactions(config);
    expect(config.content.allowedReactions).toEqual(['👍']);
  });

  it('rejects an emoji longer than 32 characters (loud 400, not silent drop)', () => {
    const config = {
      content: { allowedReactions: ['👍', 'x'.repeat(33)] },
    };
    expect(() => normalizeAllowedReactions(config)).toThrow(
      badRequest('Post reactions must each be at most 32 characters'),
    );
  });

  it('rejects an emoji that is only over-long after trimming', () => {
    const config = {
      content: {
        allowedReactions: ['x'.repeat(32) + 'x ' /* 34 chars, trims to 33 */],
      },
    };
    expect(() => normalizeAllowedReactions(config)).toThrow(
      badRequest('Post reactions must each be at most 32 characters'),
    );
  });

  it('keeps an emoji of exactly 32 characters (multi-codepoint emoji allowed)', () => {
    // A skin-tone family emoji string at the boundary.
    const boundary = '👨‍👩‍👧‍👦';
    const padded = boundary + 'x'.repeat(32 - boundary.length);
    expect(padded.length).toBe(32);
    const config = { content: { allowedReactions: [padded, '👍'] } };
    normalizeAllowedReactions(config);
    expect(config.content.allowedReactions).toContain(padded);
    expect(config.content.allowedReactions).toContain('👍');
  });

  it('dedupes repeated emojis', () => {
    const config = {
      content: { allowedReactions: ['👍', '🎉', '👍', '🎉', '😂'] },
    };
    normalizeAllowedReactions(config);
    expect(config.content.allowedReactions).toEqual(['👍', '🎉', '😂']);
  });

  it('dedupes emojis that become equal after trimming', () => {
    const config = { content: { allowedReactions: [' 👍 ', '👍'] } };
    normalizeAllowedReactions(config);
    expect(config.content.allowedReactions).toEqual(['👍']);
  });

  it('rejects more than 64 emojis', () => {
    const many = Array.from({ length: 65 }, (_, i) => `e${i}`.padEnd(2, 'x'));
    const config = { content: { allowedReactions: many } };
    expect(() => normalizeAllowedReactions(config)).toThrow(
      badRequest('Post reactions must contain at most 64 emojis'),
    );
  });

  it('accepts exactly 64 distinct emojis', () => {
    const many = Array.from({ length: 64 }, (_, i) => `e${i}`.padEnd(2, 'x'));
    const config = { content: { allowedReactions: many } };
    normalizeAllowedReactions(config);
    expect((config.content.allowedReactions as string[]).length).toBe(64);
  });

  it('rejects when trimming/deduping still leaves > 64 distinct emojis', () => {
    const many = Array.from({ length: 65 }, (_, i) => `e${i}`.padEnd(2, 'x'));
    // Add duplicates that collapse after dedupe, but keep 65 distinct.
    const config = { content: { allowedReactions: [...many, many[0]] } };
    expect(() => normalizeAllowedReactions(config)).toThrow(
      badRequest('Post reactions must contain at most 64 emojis'),
    );
  });

  it('rejects a non-array value', () => {
    const config = { content: { allowedReactions: '👍' } };
    expect(() => normalizeAllowedReactions(config)).toThrow(
      badRequest('Post reactions must be a list of emojis'),
    );
  });

  it('rejects an array containing a non-string item', () => {
    const config = {
      content: { allowedReactions: ['👍', 42] as unknown as string[] },
    };
    expect(() => normalizeAllowedReactions(config)).toThrow(
      badRequest('Post reactions must be a list of emojis'),
    );
  });

  it('leaves the config untouched when content is absent', () => {
    const config = { settings: { indexProfiles: true } };
    normalizeAllowedReactions(config);
    expect(config).toEqual({ settings: { indexProfiles: true } });
  });

  it('leaves the config untouched when allowedReactions is undefined', () => {
    const config = { content: { other: 1 } };
    normalizeAllowedReactions(config);
    expect(config).toEqual({ content: { other: 1 } });
  });

  it('leaves a valid list unchanged (idempotent on clean input)', () => {
    const config = { content: { allowedReactions: ['👍', '🎉', '❤️'] } };
    normalizeAllowedReactions(config);
    expect(config.content.allowedReactions).toEqual(['👍', '🎉', '❤️']);
  });

  it('throws a 400-shaped badRequest (key carried for i18n)', () => {
    const config = { content: { allowedReactions: 'nope' } };
    try {
      normalizeAllowedReactions(config);
      expect.unreachable('expected badRequest');
    } catch (err) {
      expect(err).toHaveProperty('__HTTP_ERROR__', true);
      expect(err).toHaveProperty('status', 400);
      expect(badRequestKey(err)).toBe(
        'Post reactions must be a list of emojis',
      );
    }
  });
});
