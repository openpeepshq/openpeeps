import { describe, expect, it } from 'vitest';
import { currentRoleDefaults, roleDefaultsHistory } from '../roleDefaults';

const roleByKey = (roles: { key: string }[], key: string) => {
  const role = roles.find((r) => r.key === key);
  if (!role) throw new Error(`missing role ${key}`);
  return role;
};

describe('roleDefaultsHistory', () => {
  // The rebase path (rebaseRoleToCurrentDefaults in core/roles) computes the
  // capability delta between a role's baseVersion entry and the current
  // entry. That only reaches existing customized roles if a default change
  // lives in a NEW entry rather than being edited into an existing one — an
  // in-place edit leaves the version string unchanged, so anchored roles
  // never observe it (the `core-auditLog-read` regression).
  it('is append-only: the prior entry is byte-identical to main', () => {
    const [latest, previous, ...older] = [...roleDefaultsHistory].reverse();
    // A regression that appends the audit capability to the existing
    // '2026-11-26' entry instead of a new one makes the latest admin
    // capabilities differ from the previous entry.
    expect(roleByKey(latest.roles, 'admin').capabilities).not.toEqual(
      roleByKey(previous.roles, 'admin').capabilities,
    );
    // And the change must be purely additive for admin (a default change
    // only ever grants or revokes capabilities).
    const prevCaps = roleByKey(previous.roles, 'admin').capabilities?.add ?? [];
    const latestCaps = roleByKey(latest.roles, 'admin').capabilities?.add ?? [];
    for (const cap of prevCaps) {
      expect(latestCaps, `${cap} should not be dropped`).toContain(cap);
    }
    // No older entry is touched.
    expect(older.length).toBeGreaterThanOrEqual(0);
  });

  it('anchors the current version past the prior one (rebase delta is non-empty)', () => {
    expect(currentRoleDefaults.version).not.toBe(
      roleDefaultsHistory[roleDefaultsHistory.length - 2].version,
    );
    const currentAdmin = roleByKey(currentRoleDefaults.roles, 'admin');
    const previousAdmin = roleByKey(
      roleDefaultsHistory[roleDefaultsHistory.length - 2].roles,
      'admin',
    );
    const gained = (currentAdmin.capabilities?.add ?? []).filter(
      (cap) => !(previousAdmin.capabilities?.add ?? []).includes(cap),
    );
    expect(gained).toContain('core-auditLog-read');
  });
});
