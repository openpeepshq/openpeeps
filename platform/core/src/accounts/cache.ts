import { AccountWithMeta } from "@openpeeps/common/types";
import { createCache } from "cache-manager";
import { allpeepDb } from "../db";
import { accountsMapping } from "./mapping";
import { expandAccount, normalizeEmailAddress } from "./helpers";

export const accountsCache = createCache({
    ttl: 60 * 60 * 1000,
    refreshThreshold: 60 * 1000,
});

export const getAccount = async (id: string, ignoreSoftDelete = false): Promise<AccountWithMeta | undefined> =>
    accountsCache.wrap(id, () => allpeepDb().then(({ db }) => ignoreSoftDelete ? accountsMapping.ignoreSoftDelete().find(db, id) : accountsMapping.find(db, id)).then(expandAccount));
