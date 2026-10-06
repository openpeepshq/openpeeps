import {
  Role,
  RoleData,
  Capabilities,
  currentRoleDefaults,
  defaultRoles,
  findRoleDefaultsVersion,
} from '@openpeepshq/common/types';
import { capabilitySetsEqual } from '@openpeepshq/common/lib';
import { findRole, findRoleByKey } from './finders';
import { allpeepDb } from '../db';
import { conflict } from '../errors';
import { rolesMapping } from './mapping';
import { profilesCache } from '../profiles/cache';

export const createRole = (roleData: RoleData) =>
  allpeepDb().then(async ({ db }) => {
    const existingRole = await findRoleByKey(roleData.key);
    if (existingRole) {
      throw conflict({
        errorKey: 'error.roleExists',
        parameters: { key: roleData.key },
      });
    }
    return rolesMapping.create(db, roleData);
  });

const capabilitiesMatchFactory = (
  capabilities: Capabilities,
  factoryRole: RoleData,
) =>
  capabilitySetsEqual(capabilities?.add, factoryRole.capabilities?.add) &&
  capabilitySetsEqual(capabilities?.remove, factoryRole.capabilities?.remove);

/**
 * Effective default flag for a write: an explicit `true` wins, and
 * capabilities that exactly match the system defaults re-adopt the role as a
 * default role even when the stored flag says otherwise — so future system
 * default updates flow into it. Such an adoption also re-anchors the role to
 * the current defaults version when the write does not set one explicitly.
 */
const withDefaultAdoption = (
  existingRole: Role | undefined,
  roleData: Partial<RoleData>,
): Partial<RoleData> => {
  const factoryRole = defaultRoles.find(
    (role) => role.key === (roleData.key ?? existingRole?.key),
  );
  if (!factoryRole) return roleData;
  const matchesFactory = capabilitiesMatchFactory(
    roleData.capabilities ?? existingRole?.capabilities,
    factoryRole,
  );
  const isDefault = roleData.default === true || matchesFactory;
  return {
    ...roleData,
    default: isDefault,
    ...(matchesFactory && roleData.baseVersion === undefined
      ? { baseVersion: currentRoleDefaults.version }
      : {}),
  };
};

/**
 * Applies the base→current delta of the system defaults to a capability
 * list: capabilities the defaults gained are added, capabilities the
 * defaults dropped are removed, everything else is kept.
 */
const applyCapabilityDelta = (
  capabilities: Capabilities,
  base: Capabilities,
  current: Capabilities,
): { add: string[]; remove: string[] } => {
  const delta = (
    list: string[] | undefined,
    from: string[] | undefined,
    to: string[] | undefined,
  ) => {
    const removed = (from ?? []).filter((c) => !(to ?? []).includes(c));
    const added = (to ?? []).filter((c) => !(from ?? []).includes(c));
    return [
      ...(list ?? []).filter((c) => !removed.includes(c)),
      ...added.filter((c) => !(list ?? []).includes(c)),
    ];
  };
  return {
    add: delta(capabilities?.add, base?.add, current?.add),
    remove: delta(capabilities?.remove, base?.remove, current?.remove),
  };
};

/**
 * Rebase patch for a customized built-in role anchored at an older defaults
 * version, or null when nothing changed. The set delta is transitive, so a
 * stale anchor still rebases correctly when intermediate versions left this
 * role untouched — the anchor only moves when capabilities actually change.
 */
const rebaseRoleToCurrentDefaults = (
  existingRole: Role,
  factoryRole: RoleData,
): Partial<RoleData> | null => {
  const baseVersion = existingRole.baseVersion;
  if (!baseVersion || baseVersion === currentRoleDefaults.version) {
    return null;
  }
  const baseRole = findRoleDefaultsVersion(baseVersion)?.roles.find(
    (role) => role.key === factoryRole.key,
  );
  if (!baseRole) return null;
  const capabilities = applyCapabilityDelta(
    existingRole.capabilities,
    baseRole.capabilities,
    factoryRole.capabilities,
  );
  const unchanged =
    capabilitySetsEqual(existingRole.capabilities?.add, capabilities.add) &&
    capabilitySetsEqual(existingRole.capabilities?.remove, capabilities.remove);
  if (unchanged) return null;
  return { capabilities, baseVersion: currentRoleDefaults.version };
};

export const updateRole = (
  id: string,
  roleData: Partial<RoleData>,
): Promise<Role> =>
  allpeepDb().then(async ({ db }) => {
    const existingRole = await findRole(id);
    const role = await rolesMapping.update(
      db,
      id,
      withDefaultAdoption(existingRole, roleData),
    );
    await profilesCache.clear();
    return role;
  });

export const setDefaultRoles = async () => {
  for (const role of defaultRoles) {
    const existingRole = await findRoleByKey(role.key);
    if (!existingRole) {
      await createRole(role);
    } else if (capabilitiesMatchFactory(existingRole.capabilities, role)) {
      if (!existingRole.default) {
        // Re-adopt roles that are exactly at the system defaults: only the
        // flag and baseVersion are written, so the name and description are
        // preserved.
        await updateRole(existingRole.id, { default: true });
      }
    } else if (existingRole.default) {
      // Default-flagged roles are system-managed: keep them in sync with the
      // current factory so newly introduced capabilities reach them.
      await updateRole(existingRole.id, role);
    } else {
      // Customized built-in roles keep their edits; only merge in what the
      // system defaults gained since their baseVersion.
      const rebased = rebaseRoleToCurrentDefaults(existingRole, role);
      if (rebased) await updateRole(existingRole.id, rebased);
    }
  }
};
