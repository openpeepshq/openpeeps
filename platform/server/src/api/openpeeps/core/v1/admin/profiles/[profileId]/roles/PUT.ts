import { endpoint, z } from '#lib/endpoint';
import { roleSchema } from '@openpeeps/common/types';
import { successResponseSchema } from '@openpeeps/common/types';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { findProfile, assignRole, unassignRole } from '@openpeeps/core/profiles';
import { findRoleByKey } from '@openpeeps/core/roles';

export const Param = z.object({
  profileId: z.string(),
});
export const Input = z.object({
  roles: roleSchema.array(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-profiles-roles-update']);

    const profile = await findProfile(input.profileId);

    if (!profile) throw notFound(`Profile with id ${input.profileId}`);

    const oldRoles = profile.roles;

    for (const role of oldRoles) {
      await unassignRole(profile, role);
    }

    const incomingUniqueRoles = input.roles.filter(
      (role: { key: string }, index: number, self: { key: string }[]) =>
        index ===
        self.findIndex((r: { key: string }) => r.key === role.key),
    );

    for (const role of incomingUniqueRoles) {
      const roleData = await findRoleByKey(role.key);

      if (roleData) {
        await assignRole(profile, roleData);
      }
    }

    return { success: true };
  },
);
