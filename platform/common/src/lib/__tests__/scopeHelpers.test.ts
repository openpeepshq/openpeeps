import { describe, expect, it } from 'vitest';
import {
  getPublicGroupReadScope,
  getPublicPostReadScope,
  scopeMatches,
  withPublicGroupReadScopes,
  withPublicPostReadScopes,
} from '../scopeHelpers';

describe('scopeMatches', () => {
  it('matches a required wildcard resource id', () => {
    expect(
      scopeMatches({
        scopes: [
          {
            scopeLevel: 'admin',
            resource: {
              type: 'db',
              id: '0192a1b2-c3d4-7890-abcd-ef1234567890',
            },
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
        scopes: [
          { scopeLevel: 'read', resource: { type: 'posts', id: 'post-1' } },
        ],
        requiredScope: {
          scopeLevel: 'read',
          resource: { type: '*', id: 'post-1' },
        },
      }),
    ).toBe(true);
  });

  it('matches jams resource scopes', () => {
    expect(
      scopeMatches({
        scopes: [
          {
            scopeLevel: 'read',
            resource: { type: 'jams', id: 'event-1' },
          },
        ],
        requiredScope: {
          scopeLevel: 'read',
          resource: { type: 'jams', id: 'event-1' },
        },
      }),
    ).toBe(true);
  });
});

describe('withPublicPostReadScopes', () => {
  it('adds read scope for a public post when read capabilities are needed', () => {
    const authData = { scopes: [] as const };
    const augmented = withPublicPostReadScopes(
      authData,
      { id: 'post-1', visibility: 'public' },
      ['core-posts-read'],
    );
    expect(augmented.scopes).toEqual([getPublicPostReadScope('post-1')]);
    expect(
      scopeMatches({
        scopes: augmented.scopes,
        requiredScope: getPublicPostReadScope('post-1'),
      }),
    ).toBe(true);
  });

  it('does not add scope for non-read capabilities', () => {
    const authData = { scopes: [] as const };
    expect(
      withPublicPostReadScopes(
        authData,
        { id: 'post-1', visibility: 'public' },
        ['core-posts-delete'],
      ),
    ).toBe(authData);
  });
});

describe('withPublicGroupReadScopes', () => {
  it('adds read scope when none grants the needed read caps', () => {
    const authData = { scopes: [] as const };
    const group = {
      id: 'group-1',
      capabilities: { none: { add: ['core-groups-read', 'core-posts-read'] } },
    };
    const augmented = withPublicGroupReadScopes(authData, group, [
      'core-groups-read',
    ]);
    expect(augmented.scopes).toEqual([getPublicGroupReadScope('group-1')]);
  });

  it('does not add scope for private groups without none read', () => {
    const authData = { scopes: [] as const };
    const group = {
      id: 'group-1',
      capabilities: { member: { add: ['core-groups-read'] } },
    };
    expect(
      withPublicGroupReadScopes(authData, group, ['core-groups-read']),
    ).toBe(authData);
  });
});
