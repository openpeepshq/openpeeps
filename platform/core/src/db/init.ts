import { logger } from "../log";
import { arangoDb } from "./arango";
import { ensureFunction, ensureIndexedCollection, ensureView } from "./helpers";
import { OpenpeepsDatabase } from "./types";
import { Base } from "@openpeeps/common/types";
import { collectionInfos, viewInfos } from "./structure";
import { runDataMigrations } from "./dataMigrations";
import { userFunctionDefinitions } from "./structure/functions";


const log = logger('allpeep:db');

export const initDb = async (): Promise<OpenpeepsDatabase> => {
    const database = await arangoDb();

    log.info('Ensuring functions');
    for (const functionDefinition of userFunctionDefinitions) {
        log.info(`Ensuring function ${functionDefinition.name}`);
        await ensureFunction(database, functionDefinition);
    }

    await ensureIndexedCollection<Base<never>>(
        database,
        collectionInfos.dataMigrationsCollection,
    );

    await runDataMigrations(database);

    log.info('Ensuring collections');

    for (const collectionInfo of Object.values(collectionInfos)) {
        log.info(`Ensuring collection ${collectionInfo.name}`);
        await ensureIndexedCollection<Base<never>>(
            database,
            collectionInfo,
        );
    }

    log.info('Ensuring views');

    for (const viewInfo of viewInfos) {
        log.info(`Ensuring view ${viewInfo.name}`);
        await ensureView(database, viewInfo);
    }



    return {
        db: database,
    };
};

