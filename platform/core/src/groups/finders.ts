import { allpeepDb } from '../db';
import { AuthorizationData, PublicProfile } from '@openpeepshq/common/types';
import { adminGroupsMapping, groupsMapping } from './mapping';
import { profilesMapping, membersRelation } from '../profiles/mapping';
import { canSeeGroupFilter } from './helpers';
import { sorts } from '../db/pg/queries';

export const findGroup = (id: string) =>
  allpeepDb().then((db) => groupsMapping.find(db.db, id));

export const findGroupByHandle = (handle: string) =>
  allpeepDb().then((db) =>
    groupsMapping.findOneBy(db.db, { matches: { handle } }),
  );
export const existsGroupByHandle = (handle: string) =>
  allpeepDb()
    .then((db) =>
      groupsMapping
        .ignoreSoftDelete()
        .findOneBy(db.db, { matches: { handle } }),
    )
    .then(Boolean);

export const listGroups = (authData: AuthorizationData) =>
  allpeepDb().then((db) =>
    groupsMapping
      .filter(canSeeGroupFilter(authData.profile))
      .sort(sorts.lastPostAtDesc)
      .all(db.db),
  );

export const listGroupsByProfile = (profile: PublicProfile) =>
  allpeepDb().then(({ db }) =>
    profilesMapping.relationsFrom(profile, membersRelation).all(db),
  );

export const listAdminGroups = () =>
  allpeepDb().then((db) =>
    adminGroupsMapping.sort(sorts.lastPostAtDesc).all(db.db),
  );
