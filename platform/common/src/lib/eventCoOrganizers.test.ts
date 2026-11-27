import { describe, expect, it } from 'vitest';
import type { AuthorizationData, PublicPostInput, PublicPost } from '../types';
import { getPostRelationships } from './capabilitiesHelpers';
import { canManageEventRsvps } from './postHelpers';

const event = (coOrganizers?: string[], extra: Record<string, unknown> = {}) =>
  ({
    visibility: 'public',
    profile: { id: 'organizer' },
    data: { type: 'event', coOrganizers, ...extra },
  }) as unknown as PublicPostInput;

const auth = (profileId: string) =>
  ({ profile: { id: profileId } }) as unknown as AuthorizationData;

describe('getPostRelationships co-organizer (collaborator) derivation', () => {
  it('grants the collaborator relationship to a named co-organizer', () => {
    const relationships = getPostRelationships(
      auth('co'),
      event(['co', 'other']),
    );
    expect(relationships).toContain('collaborator');
  });

  it('does not grant collaborator to a profile outside the list', () => {
    const relationships = getPostRelationships(auth('stranger'), event(['co']));
    expect(relationships).not.toContain('collaborator');
  });

  it('does not grant collaborator when the list is empty or absent', () => {
    expect(getPostRelationships(auth('co'), event([]))).not.toContain(
      'collaborator',
    );
    expect(getPostRelationships(auth('co'), event(undefined))).not.toContain(
      'collaborator',
    );
  });

  it('does not grant collaborator on non-event posts', () => {
    const post = {
      visibility: 'public',
      profile: { id: 'organizer' },
      data: { type: 'post', body: 'hi' },
    } as unknown as PublicPostInput;
    expect(getPostRelationships(auth('co'), post)).not.toContain(
      'collaborator',
    );
  });
});

describe('canManageEventRsvps for co-organizers', () => {
  const base = (coOrganizers?: string[]) =>
    ({
      profile: { id: 'organizer' },
      data: { type: 'event', coOrganizers },
    }) as unknown as PublicPost;

  it('lets a co-organizer manage RSVPs', () => {
    expect(canManageEventRsvps({ id: 'co' }, base(['co']))).toBe(true);
  });

  it('still lets the primary organizer manage RSVPs', () => {
    expect(canManageEventRsvps({ id: 'organizer' }, base(['co']))).toBe(true);
  });

  it('keeps a stranger out', () => {
    expect(canManageEventRsvps({ id: 'stranger' }, base(['co']))).toBe(false);
  });
});
