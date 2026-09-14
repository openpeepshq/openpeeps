import { describe, expect, it } from 'vitest';
import { publicProfileSchema } from '../api';

const baseProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'local' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  handle: 'johndoe',
  displayName: 'John Doe',
};

describe('publicProfileSchema roles', () => {
  it('keeps role identity and strips capabilities', () => {
    const result = publicProfileSchema.parse({
      ...baseProfile,
      roles: [
        {
          key: 'owner',
          displayName: 'Owner',
          default: true,
          capabilities: { add: ['*'], remove: [] },
          description: 'The owner of this community can do everything',
        },
      ],
    });

    expect(result.roles).toEqual([{ key: 'owner', displayName: 'Owner' }]);
  });

  it('allows profiles without roles', () => {
    const result = publicProfileSchema.parse(baseProfile);
    expect(result.roles).toBeUndefined();
  });
});
