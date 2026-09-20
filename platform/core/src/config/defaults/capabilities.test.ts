import { describe, expect, it } from 'vitest';
import { capabilitiesConfigSchema } from '@openpeepshq/common/types';
import { defaultCapabilitiesConfig } from './capabilities';

describe('defaultCapabilitiesConfig', () => {
  it('satisfies the public capabilities schema', () => {
    const parsed = capabilitiesConfigSchema.safeParse(
      defaultCapabilitiesConfig,
    );
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });
});
