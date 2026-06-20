import { Database, aql } from 'arangojs';
import { collectionInfos } from '../../structure';
import { logger } from '../../../log';

const log = logger('db:dataMigrations');

export default {
  key: 'bed1669c-8487-4ab9-ba23-8aec8b6e215d',
  info: 'Deleting Duplicate Group Memberships',
  migration: async (db: Database) => {
    const edgeColName = collectionInfos.userGroupsCollection.name;

    if (!(await db.collection(edgeColName).exists())) {
      log.info('User groups collection does not exist, skipping migration');
      return;
    }

    const edgeCol = db.collection(edgeColName);

    const cursor = await db.query(aql`
      FOR edge IN ${edgeCol}
        COLLECT fromNode = edge._from, toNode = edge._to INTO groupedEdges = edge
        FILTER LENGTH(groupedEdges) > 1
        
        FOR extraEdge IN SLICE(groupedEdges, 1)
          REMOVE extraEdge IN ${edgeCol}
    `);

    await cursor.all();
    log.info('Deleted duplicate group memberships');
  },
};
