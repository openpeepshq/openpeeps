import type {
  GroupData,
  GroupRelationship,
  GroupWithMeta,
  PostWithMeta,
  ProfileWithMeta,
  PublicProfile,
} from '@openpeepshq/common/types';
import { groupsMapping } from './mapping';
import { allpeepDb, collectionInfos } from '../db';
import { addMember, removeMember, updateMember } from './helpers';
import { postsMapping } from '../posts';
import { throwIfUndefined } from '../lib/utils';
import type { RelationWithMapping } from '../db/pg/map/queryTypes';
import { profilesCache } from '../profiles/cache';

export const addMembersToGroup = (
  group: GroupWithMeta,
  members: PublicProfile[],
) =>
  allpeepDb().then(({ db }) =>
    Promise.all(
      members.map((p) =>
        addMember(db, p, group, { roles: ['member'] }).then(() =>
          profilesCache.del(p.id),
        ),
      ),
    ),
  );

export const removeMembersFromGroup = (
  group: GroupWithMeta,
  members: PublicProfile[],
) =>
  allpeepDb().then(({ db }) =>
    Promise.all(
      members.map((p) =>
        removeMember(db, p, group).then(() => profilesCache.del(p.id)),
      ),
    ),
  );

export const createGroup = async (
  groupData: GroupData,
  profile: ProfileWithMeta,
  members: PublicProfile[] = [],
): Promise<GroupWithMeta> => {
  const { db } = await allpeepDb();
  const emptyGroup = await groupsMapping.create(db, groupData);
  await addMember(db, profile as PublicProfile, emptyGroup, {
    roles: ['admin'],
  });
  profilesCache.del(profile.id);

  const filteredMembers = members?.filter((member) => member.id !== profile.id);
  const uniqueMembers = filteredMembers
    ? Array.from(new Set(filteredMembers.map((m) => m.id))).map(
        (id) => filteredMembers.find((m) => m.id === id)!,
      )
    : [];

  await addMembersToGroup(emptyGroup, uniqueMembers);

  return throwIfUndefined(await groupsMapping.find(db, emptyGroup.id));
};

export const updateGroup = (group: GroupWithMeta, groupData: GroupData) =>
  allpeepDb().then(({ db }) => groupsMapping.update(db, group.id, groupData));

export const deleteGroup = async (group: GroupWithMeta) => {
  const { db } = await allpeepDb();
  await groupsMapping.delete(db, group.id);
  const posts = await groupsMapping
    .relationsFrom(group, {
      alias: 'posts',
      edgeCollection: collectionInfos.postGroupsCollection.name,
      direction: 'INBOUND',
      cardinality: 'many',
      mapping: postsMapping.data(),
      skipEdge: true,
    } as RelationWithMapping<PostWithMeta>)
    .all(db);

  for (const post of posts) {
    await postsMapping.delete(db, post.id);
  }
};

export const setMemberRoles = async (
  profile: PublicProfile,
  group: GroupWithMeta,
  roles: GroupRelationship[],
) => allpeepDb().then(({ db }) => updateMember(db, profile, group, { roles }));
