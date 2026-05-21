import { describe, expect, it } from 'vitest';
import { scopeMatches } from '../scopeHelpers';

describe('scopeMatches', () => {
  it('matches a required wildcard resource id', () => {
    expect(
      scopeMatches({
        scopes: [
          {
            scopeLevel: 'admin',
            resource: { type: 'db', id: '0192a1b2-c3d4-7890-abcd-ef1234567890' },
          },
        ],
        requiredScope: {
          scopeLevel: 'admin',
          resource: { type: 'db', id: '*' },
        },
      }),
    ).toBe(true);
  });

  it('matches a required wildcard resource type', () => {
    expect(
      scopeMatches({
        scopes: [{ scopeLevel: 'read', resource: { type: 'posts', id: 'post-1' } }],
        requiredScope: {
          scopeLevel: 'read',
          resource: { type: '*', id: 'post-1' },
        },
      }),
    ).toBe(true);
  });
});
