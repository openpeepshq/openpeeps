import { arangoDb } from './arango';

export const empty = async () => {
  const database = await arangoDb();
  const collections = await database.collections();

  for (const collection of collections) {
    console.log(`Dropping collection ${collection.name}`);
    await collection.drop();
  }
};
