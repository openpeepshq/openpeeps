import { map } from '../db/pg/map';
import { Role, RoleData } from '@openpeeps/common/types';
import { collectionInfos } from '../db';

export const rolesMapping = map<RoleData, Role>({
  collection: collectionInfos.rolesCollection.name,
});
