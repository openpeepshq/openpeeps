import { RoleData } from '@openpeepshq/common/types';
import { findRoleByKey } from './finders';
import { defaultRoles } from './defaults';
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

export const updateRole = (id: string, roleData: Partial<RoleData>) =>
  allpeepDb()
    .then(async ({ db }) => rolesMapping.update(db, id, roleData))
    .then(() => profilesCache.clear());

export const setDefaultRoles = async () => {
  for (const role of defaultRoles) {
    const existingRole = await findRoleByKey(role.key);
    if (!existingRole) {
      await createRole(role);
    } else if (existingRole.default) {
      await updateRole(existingRole.id, role);
    }
  }
};
