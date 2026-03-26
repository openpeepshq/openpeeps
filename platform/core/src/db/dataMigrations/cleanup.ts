import { aql, Database } from 'arangojs';
import { edgeCollections } from './helpers';
import { logger } from '../../log';

const log = logger('db:cleanup');

export const cleanupEdges = async (database: Database) => {
  const startTimestamp = Date.now();
  log.info('Cleaning up dangling edges...');
  for (const edgeCollection of await edgeCollections(database)) {

    let count = 0;
    for await (const edge of await database.query(
      aql`FOR e IN ${edgeCollection} FILTER DOCUMENT(e._from) == null || DOCUMENT(e._to) == null RETURN e`,
    )) {
      await edgeCollection.remove(edge);
      count++;
    }
    log.info(
      `Removed ${count} dangling edges in ${edgeCollection.name} [${Date.now() - startTimestamp} ms])`,
    );

  }
};
