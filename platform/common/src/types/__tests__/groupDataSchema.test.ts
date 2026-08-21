import { describe, expect, it } from 'vitest';
import { GROUP_DISPLAY_NAME_MAX_LENGTH, groupDataSchema } from '../models';

describe('groupDataSchema', () => {
  it('rejects a display name over the character limit with a human message', () => {
    const result = groupDataSchema.safeParse({
      handle: 'ok_handle',
      displayName: 'A'.repeat(GROUP_DISPLAY_NAME_MAX_LENGTH + 1),
      capabilities: {},
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Group name should be 30 characters or fewer',
      );
    }
  });
});
