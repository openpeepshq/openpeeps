import { Database, aql } from 'arangojs';
import { collectionInfos } from '../../pg/collections';
import { logger } from '../../../log';

const log = logger('db:dataMigrations');

export default {
  key: '019637b0-1430-7000-8000-duplicate-roles',
  info: 'Deleting duplicate profile role assignments',
  migration: async (db: Database) => {
    const edgeColName = collectionInfos.hasRoleCollection.name;

    if (!(await db.collection(edgeColName).exists())) {
      log.info('hasRole collection does not exist, skipping migration');
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
    log.info('Deleted duplicate profile role assignments');
  },
};
