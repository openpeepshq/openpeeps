import { Database } from "arangojs";
import { profilesMapping } from "../../../profiles/mapping";
import { logger } from "../../../log";
import { Role, RoleData } from "@openpeeps/common/types";
import { map } from "@openpeeps/arango-querybuilder";
import { collectionInfos } from "../../structure";
import { roleAssigner, roleUnassigner } from "../../../profiles/helpers";

const log = logger('db:dataMigrations');


export default {
  key: '019a2b1f-b21c-7f69-8b24-e186bb59c6b5',
  info: 'Make current users members so they can keep posting',
  migration: async (db: Database) => {
    const rolesMapping = map<RoleData, Role>({
      collection: collectionInfos.rolesCollection.name,
    })

    if (!(await db.collection('roles').exists())) {
      return;
    }

    const memberRole = await rolesMapping.findOneBy(db, { matches: { key: 'member' } });
    const pendingMemberRole = await rolesMapping.findOneBy(db, { matches: { key: 'pendingmember' } });
    if (!pendingMemberRole) {
      log.error('Missing role pendingmember')
      return;
    }
    if (!memberRole) {
      log.error('Missing role member')
      return;
    }
    const allProfiles = (await profilesMapping.all(db));
    for (const profile of allProfiles) {
      if (profile.type === 'guest') {
        continue;
      }
      if (
        profile.roles.length === 0 ||
        (
          profile.roles.some(role => role.key === 'pendingmember')
        )
      ) {
        roleUnassigner(db, profile, pendingMemberRole);
        roleAssigner(db, profile, memberRole);
      }
    }

  },
};
