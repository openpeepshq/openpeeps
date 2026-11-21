import { describe, expect, it } from 'vitest';
import { REACTION_TYPES, reactionTypeSchema } from '../models';

describe('reactionTypeSchema', () => {
  it('accepts every reaction in the curated set', () => {
    for (const reaction of REACTION_TYPES) {
      expect(reactionTypeSchema.safeParse(reaction).success).toBe(true);
    }
  });

  it('rejects reactions outside the set', () => {
    expect(reactionTypeSchema.safeParse('💖').success).toBe(false);
    // Skin-tone variants are distinct values, not part of the set.
    expect(reactionTypeSchema.safeParse('👍🏿').success).toBe(false);
    expect(reactionTypeSchema.safeParse('').success).toBe(false);
  });

  it('keeps thumbs up first so it stays the default quick reaction', () => {
    expect(REACTION_TYPES[0]).toBe('👍');
  });
});
