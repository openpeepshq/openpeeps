import { Command } from 'commander';
import {
  deleteProfile,
  findProfileByHandle,
  listProfiles,
  updateProfile,
  assignRole,
  unassignRole,
} from '@openpeepshq/core/profiles';
import {
  findRoleByKey,
  listRoles,
} from '@openpeepshq/core/roles';
import { uuidv4 } from 'uuidv7';

export const registerProfilesCommand = (program: Command) => {
  const profiles = program
    .command('profiles')
    .description('Manage profiles');

  profiles
    .command('role')
    .description('Assign or remove a role')
    .requiredOption('-u, --handle <handle>', 'Profile handle')
    .requiredOption('-r, --role <role>', 'Role key')
    .option('--remove', 'Remove role assignment')
    .action(async (options) => {
      const {
        handle,
        role,
        remove,
      } = options as {
        handle: string;
        role: string;
        remove?: boolean;
      };
      await roleCommand({ handle, role, remove: !!remove });
    });

  profiles
    .command('list')
    .description('List profiles')
    .action(async () => {
      await listProfilesCommand();
    });

  profiles
    .command('delete')
    .description('Delete a profile')
    .argument('[handle]', 'Profile handle')
    .option('-u, --handle <handle>', 'Profile handle')
    .action(async (handle: string | undefined, options) => {
      const resolvedHandle =
        handle ?? (options?.handle as string | undefined);
      if (!resolvedHandle) {
        console.log('Handle is required.');
        process.exit(1);
      }
      await deleteProfileCommand(resolvedHandle);
    });

  profiles
    .command('fix')
    .description('Normalize profile handles')
    .action(async () => {
      await fixProfilesCommand();
    });
};

const deleteProfileCommand = async (handle: string) => {
  const profile = await findProfileByHandle(handle);

  if (profile) {
    await deleteProfile(profile.id);
    console.log(`Profile ${handle} deleted.`);
  } else {
    console.log(`Profile ${handle} not found.`);
  }
};

const roleCommand = async ({
  handle,
  role: key,
  remove,
}: {
  handle: string;
  role: string;
  remove: boolean;
}) => {
  const profile = await findProfileByHandle(handle);
  if (!profile) {
    console.log(`Could not find profile with handle ${handle}`);
    return;
  }

  const role = await findRoleByKey(key);
  if (!role) {
    console.log(`Could not find role with key ${key}`);
    console.log(
      `The available roles are ${(await listRoles()).map((r) => r.key).join(', ')}.`,
    );
    return;
  }

  if (remove) {
    await unassignRole(profile, role);
    console.log(`Unassigned role ${role.key} from profile ${profile.handle}`);
  } else {
    await assignRole(profile, role);
    console.log(`Assigned role ${role.key} to profile ${profile.handle}`);
  }
};
const listProfilesCommand = async () => {
  console.log(JSON.stringify(await listProfiles(), null, 4));
};
const fixProfilesCommand = async () => {
  for (const profile of await listProfiles()) {
    if (!/^[a-zA-Z0-9_-]+$/.test(profile.handle)) {
      profile.handle = profile.handle.replace(/[^a-zA-Z0-9_-]/g, '-');
    }
    if (profile.handle === '') {
      profile.handle = uuidv4();
    }
    if (profile.handle.length > 16) {
      profile.handle = profile.handle.substring(0, 16);
    }
    if (profile.displayName && profile.displayName.length > 30) {
      profile.displayName = profile.displayName?.substring(0, 30);
    }
    await updateProfile(profile.id, profile);
  }
};
