import { describe, expect, it } from 'vitest';
import type { Role } from '../../types';
import {
  canAccessAdminMenu,
  canAccessAdminSection,
  getVisibleAdminSections,
} from '../adminSections';

const roleWith = (add: string[]): Role =>
  ({
    key: 'test',
    displayName: 'Test',
    default: false,
    capabilities: { add, remove: [] },
  }) as Role;

describe('adminSections', () => {
  it('shows moderation when the profile can read reports', () => {
    const roles = [roleWith(['core-reports-read', 'core-local'])];
    expect(
      canAccessAdminSection(roles, {
        key: 'moderation',
        path: '/admin/moderation',
        capabilities: ['core-reports-read'],
      }),
    ).toBe(true);
    expect(canAccessAdminMenu(roles)).toBe(true);
  });

  it('shows the moderator admin sections when read capabilities are granted', () => {
    const roles = [
      roleWith([
        'core-accounts-read',
        'core-profiles-read',
        'core-groups-read',
        'core-inviteLinks-read',
        'core-reports-read',
        'core-analytics-read',
        'core-local',
      ]),
    ];
    const keys = getVisibleAdminSections(roles).map((s) => s.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'members',
        'groups',
        'invites',
        'moderation',
        'analytics',
      ]),
    );
    expect(keys).not.toContain('backups');
    expect(keys).not.toContain('configuration');
    expect(keys).not.toContain('diagnostics');
  });

  it('does not show moderation when the profile can only update reports', () => {
    const roles = [roleWith(['core-reports-update', 'core-local'])];
    expect(getVisibleAdminSections(roles).map((s) => s.key)).not.toContain(
      'moderation',
    );
  });

  it('shows backups when the profile has the plural backup read capability', () => {
    const roles = [roleWith(['core-backups-read'])];
    expect(getVisibleAdminSections(roles).map((s) => s.key)).toContain(
      'backups',
    );
  });

  it('shows all sections for the owner wildcard', () => {
    const roles = [roleWith(['*'])];
    expect(getVisibleAdminSections(roles).length).toBe(10);
  });

  it('shows database when the profile has core-db-access', () => {
    const roles = [roleWith(['core-db-access'])];
    expect(getVisibleAdminSections(roles).map((s) => s.key)).toContain(
      'database',
    );
  });
});
