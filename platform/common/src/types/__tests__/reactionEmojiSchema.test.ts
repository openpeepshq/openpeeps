import { describe, expect, it } from 'vitest';
import { REACTION_TYPES, resolveAllowedReactions } from '../models';
import { reactionEmojiSchema } from '../config';

describe('reactionEmojiSchema', () => {
  it('accepts every reaction in the curated set', () => {
    for (const reaction of REACTION_TYPES) {
      expect(reactionEmojiSchema.safeParse(reaction).success).toBe(true);
    }
  });

  it('accepts custom community emojis, including skin-tone variants', () => {
    expect(reactionEmojiSchema.safeParse('💖').success).toBe(true);
    expect(reactionEmojiSchema.safeParse('👍🏿').success).toBe(true);
  });

  it('rejects empty, whitespace, and oversized values', () => {
    expect(reactionEmojiSchema.safeParse('').success).toBe(false);
    expect(reactionEmojiSchema.safeParse('   ').success).toBe(false);
    expect(reactionEmojiSchema.safeParse('x'.repeat(33)).success).toBe(false);
  });

  it('keeps thumbs up first so it stays the default quick reaction', () => {
    expect(REACTION_TYPES[0]).toBe('👍');
  });
});

describe('resolveAllowedReactions', () => {
  it('falls back to the curated defaults when nothing is configured', () => {
    expect(resolveAllowedReactions(undefined)).toEqual([...REACTION_TYPES]);
    expect(resolveAllowedReactions(null)).toEqual([...REACTION_TYPES]);
    expect(resolveAllowedReactions({})).toEqual([...REACTION_TYPES]);
    expect(resolveAllowedReactions({ content: {} })).toEqual([
      ...REACTION_TYPES,
    ]);
    expect(
      resolveAllowedReactions({ content: { allowedReactions: [] } }),
    ).toEqual([...REACTION_TYPES]);
  });

  it('returns the configured set, trimmed and deduplicated', () => {
    expect(
      resolveAllowedReactions({
        content: { allowedReactions: ['🐰', '🐰', ' 🚆 '] },
      }),
    ).toEqual(['🐰', '🚆']);
  });

  it('lets a community remove curated defaults', () => {
    expect(
      resolveAllowedReactions({ content: { allowedReactions: ['🐰'] } }),
    ).toEqual(['🐰']);
  });
});
