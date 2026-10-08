import { describe, expect, it } from 'vitest';
import type { Scope } from '@openpeepshq/common/types';
import { accessTokenScopeLabel, updateScopeAt } from './useAccessTokens';

const scopes: Scope[] = [
  { scopeLevel: 'read', resource: { type: 'posts', id: '*' } },
  { scopeLevel: 'write', resource: { type: 'groups', id: '*' } },
];

describe('accessTokenScopeLabel', () => {
  it('formats level, resource type and id', () => {
    expect(accessTokenScopeLabel(scopes[0])).toBe('read:posts:*');
  });

  it('defaults a missing level to read and a missing id to *', () => {
    expect(accessTokenScopeLabel({ resource: { type: 'jams' } } as Scope)).toBe(
      'read:jams:*',
    );
  });
});

describe('updateScopeAt', () => {
  it('changes only the targeted scope level', () => {
    const next = updateScopeAt(scopes, 1, { scopeLevel: 'admin' });
    expect(next[1]).toEqual({
      scopeLevel: 'admin',
      resource: { type: 'groups', id: '*' },
    });
    expect(next[0]).toBe(scopes[0]);
  });

  it('changes the resource type while keeping the id', () => {
    const next = updateScopeAt(scopes, 0, { resourceType: 'profiles' });
    expect(next[0].resource).toEqual({ type: 'profiles', id: '*' });
  });
});
