import { map } from '../db/pg/map';
import { Role, RoleData } from '@openpeepshq/common/types';
import { collectionInfos } from '../db';

export const rolesMapping = map<RoleData, Role>({
  collection: collectionInfos.rolesCollection.name,
});
