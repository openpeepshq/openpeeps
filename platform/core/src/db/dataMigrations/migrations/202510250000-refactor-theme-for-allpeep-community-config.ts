import { Database } from 'arangojs';

export default {
  key: '8bdf3512-0649-48c8-a9af-b6bfd1f86f1a',
  info: 'Refactor theme for allpeep-community config to light/dark structure',
  migration: async (db: Database) => {
    const collection = db.collection('configs');

    if (
      (await collection.exists()) &&
      (await collection.documentExists('allpeep-community'))
    ) {
      const doc = await collection.document('allpeep-community');

      const theme = doc.config?.theme;

      // Run migration only if light/dark keys are not present yet
      if (theme && !('light' in theme) && !('dark' in theme)) {
        const {
          base,
          background,
          backgroundAuth,
          icon,
          logoFull,
          logoSmall,
          primaryHex,
          ...restTheme
        } = theme;

        const newDoc = {
          ...doc,
          config: {
            ...doc.config,
            theme: {
              ...restTheme,
              base,
              background,
              backgroundAuth,
              icon,
              logoFull,
              logoSmall,
              primaryHex,
              light: {
                background,
                backgroundAuth,
                icon,
                logoSmall,
                primaryHex,
              },
              dark: {
                background,
                backgroundAuth,
                icon,
                logoSmall,
                primaryHex,
              },
            },
          },
        };

        await collection.replace('allpeep-community', newDoc);
        console.log('✅ Config migration applied: allpeep-community updated');
      } else {
        console.log(
          'ℹ️ Migration skipped: config already has light/dark theme',
        );
      }
    }
  },
};
