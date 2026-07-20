import { aql, Database } from 'arangojs';

export default {
  key: '0199ec4e-aed3-787c-a180-9aed9166a882',
  info: 'Remove jam messages left without profileId because of a bad migration',
  migration: async (db: Database) => {
    if (await db.collection('jamEvents').exists()) {
      db.query(aql`
        FOR doc IN jamEvents
          FILTER !doc.profileId
          REMOVE doc IN jamEvents
      `);
    }
  },
};
