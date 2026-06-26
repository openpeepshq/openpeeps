import { Database, aql } from 'arangojs';
import { collectionInfos } from '../../pg/collections';
import { logger } from '../../../log';

const log = logger('db:dataMigrations');

export default {
  key: '41c542ad-1dd5-4407-bac5-dfe2aa83edcf',
  info: 'Delete guest reports and their reportedProfile edges',
  migration: async (db: Database) => {
    const reportsColName = collectionInfos.reportsCollection.name;
    const edgeColName = collectionInfos.isReportedProfileCollection.name;

    const reportsCol = db.collection(reportsColName);
    const edgeCol = db.collection(edgeColName);

    if (!(await reportsCol.exists()) || !(await edgeCol.exists())) {
      log.info('Reports or Edge collection missing. Skipping.');
      return;
    }

    log.info('Finding guest reports and edges...');

    const cursor = await db.query(aql`
      FOR report IN ${reportsCol}
        FOR profile, edge IN 1..1 OUTBOUND report ${edgeCol}
          FILTER profile.type == "guest"
          RETURN { reportKey: report._key, edgeKey: edge._key }
    `);

    const itemsToDelete = await cursor.all();

    if (itemsToDelete.length === 0) {
      log.info('No guest reports found.');
      return;
    }

    const reportKeys = itemsToDelete.map((i) => i.reportKey);
    const edgeKeys = itemsToDelete.map((i) => i.edgeKey);

    log.info(`Found ${reportKeys.length} guest reports. Deleting...`);

    await edgeCol.removeAll(edgeKeys);
    await reportsCol.removeAll(reportKeys);

    log.info(
      `Successfully deleted ${reportKeys.length} reports and their edges.`,
    );
  },
};
