import { describe, expect, it } from 'vitest';
import { communityConfigSchema } from '@openpeepshq/common/types';
import { defaultCommunityConfig } from './community';

describe('defaultCommunityConfig', () => {
  it('satisfies the community config schema', () => {
    const parsed = communityConfigSchema.safeParse(defaultCommunityConfig);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it('does not set a defaultProfileAvatar (uses initials instead)', () => {
    expect(
      defaultCommunityConfig.theme.light.defaultProfileAvatar,
    ).toBeUndefined();
    expect(
      defaultCommunityConfig.theme.dark.defaultProfileAvatar,
    ).toBeUndefined();
  });
});
