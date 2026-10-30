import { describe, expect, it } from 'vitest';
import type {
  AuthorizationData,
  GroupWithMeta,
} from '@openpeepshq/common/types';
import { profileCanCreateEvent } from './useEventComposer';

const auth = (
  add: string[],
  memberships: NonNullable<AuthorizationData['profile']>['memberships'] = [],
): AuthorizationData =>
  ({
    scopes: [],
    profile: {
      roles: [{ capabilities: { add, remove: [] } }],
      memberships,
    },
  }) as AuthorizationData;

const groupMembership = (
  remove: string[],
): NonNullable<AuthorizationData['profile']>['memberships'][number] =>
  ({
    roles: ['member'],
    group: {
      id: 'group-1',
      capabilities: {
        member: { add: ['core-posts-create-*'], remove },
      },
    } as GroupWithMeta,
  }) as NonNullable<AuthorizationData['profile']>['memberships'][number];

describe('profileCanCreateEvent', () => {
  it('allows the default member wildcard', () => {
    expect(
      profileCanCreateEvent(auth(['core-local', 'core-posts-create-*'])),
    ).toBe(true);
  });

  it('denies a member role that cannot create events', () => {
    expect(
      profileCanCreateEvent(
        auth([
          'core-local',
          'core-posts-create-note-*',
          'core-posts-create-question-*',
          'core-posts-create-article-*',
        ]),
      ),
    ).toBe(false);
  });

  it('allows a group membership that grants event creation', () => {
    expect(
      profileCanCreateEvent(auth(['core-local'], [groupMembership([])])),
    ).toBe(true);
  });

  it('denies a group membership that removes event creation', () => {
    expect(
      profileCanCreateEvent(
        auth(['core-local'], [groupMembership(['core-posts-create-event'])]),
      ),
    ).toBe(false);
  });
});
