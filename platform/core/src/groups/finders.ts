import { allpeepDb } from '../db';
import { AuthorizationData, PublicProfile } from '@openpeeps/common/types';
import { groupsMapping } from './mapping';
import { profilesMapping, membersRelation } from '../profiles/mapping';
import { canSeeGroupFilter } from './helpers';

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
      .sort([['DOC.lastPostAt', 'DESC']])
      .all(db.db),
  );

export const listGroupsByProfile = (profile: PublicProfile) =>
  allpeepDb().then(({ db }) =>
    profilesMapping.relationsFrom(profile, membersRelation).all(db),
  );

export const listAllGroups = () =>
  allpeepDb().then((db) => groupsMapping.all(db.db));
