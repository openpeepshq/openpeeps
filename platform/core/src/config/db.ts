import { ConfigData } from "@openpeeps/common/types"
import { allpeepDb, collectionInfos } from "../db"

export const storeConfig = (key: string, config: ConfigData) =>
    allpeepDb()
        .then(({ db }) =>
            db.collection(collectionInfos.configCollection.name).save(
                { ...config, _key: key, updatedAt: '', createdAt: '' },
                { overwriteMode: 'update', returnNew: true },
            )
        )
        .then((result) => result.new);

export const loadConfig = (key: string) =>
    allpeepDb().then(({ db }) =>
        db.collection(collectionInfos.configCollection.name).document(key, { graceful: true })
    );