import { describe, expect, it } from 'vitest';
import { accountNameSchema, profileDataSchema } from '../models';

describe('accountNameSchema', () => {
  it('accepts alphanumeric handles with underscores and hyphens', () => {
    expect(accountNameSchema.safeParse('Orron').success).toBe(true);
    expect(accountNameSchema.safeParse('lord_osky').success).toBe(true);
    expect(accountNameSchema.safeParse('Lord-Osky').success).toBe(true);
  });

  it('rejects spaces and punctuation such as parentheses', () => {
    const result = accountNameSchema.safeParse('Orron (Lord Osky)');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/letters, numbers/i);
    }
  });

  it('rejects handles longer than 16 characters', () => {
    expect(accountNameSchema.safeParse('a'.repeat(17)).success).toBe(false);
  });

  it('rejects reserved handles', () => {
    const result = accountNameSchema.safeParse('admin');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Handle is reserved');
    }
  });
});

describe('profileDataSchema handle rules', () => {
  const localBase = {
    displayName: 'Ada',
    type: 'local' as const,
    activityPub: { domain: 'example.com' },
  };

  it('stores local and federated handles up to 64 characters', () => {
    expect(
      profileDataSchema.safeParse({ ...localBase, handle: 'a'.repeat(16) })
        .success,
    ).toBe(true);
    expect(
      profileDataSchema.safeParse({
        handle: 'a'.repeat(32),
        type: 'federated',
        activityPub: { domain: 'mastodon.social' },
      }).success,
    ).toBe(true);
  });
});
