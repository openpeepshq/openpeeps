import { aql, Database } from 'arangojs';

export default {
  key: '018fa9a0-ae6a-79e5-a529-6d13f335dbc4',
  info: 'Add note type to create entries',
  migration: async (db: Database) => {
    if (await db.collection('entries').exists()) {
      await db.query(aql`
				FOR e IN entries
				  FILTER e.data.type == null
					UPDATE { _key: e._key, data: {type: 'note'}} 
					IN entries
			`);
    }
  },
};
