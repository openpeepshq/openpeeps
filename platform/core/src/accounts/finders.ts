import { Profile } from "@openpeeps/common/types";
import { allpeepDb } from "../db";
import { accountsMapping } from "./mapping";
import { profilesMapping } from "../profiles/mapping";
import { profileAccountRelation } from "../profiles/mapping";
import { expandAccount } from "./helpers";

export const findAccount = (id: string) =>
    allpeepDb().then(({ db }) => accountsMapping.find(db, id)).then(expandAccount);

export const findAccountByEmail = (email: string) =>
    allpeepDb()
        .then(({ db }) => accountsMapping.findOneBy(db, { matches: { email } }))
        .then(expandAccount);

export const existsAccountByEmail = (email: string) =>
    allpeepDb()
        .then(({ db }) => accountsMapping.ignoreSoftDelete().findOneBy(db, { matches: { email } }))
        .then(Boolean);

export const findByProfile = (profile: Profile) =>
    allpeepDb().then(({ db }) => profilesMapping.relationsFrom(profile, profileAccountRelation).all(db));

export const listAccounts = () =>
    allpeepDb()
        .then(({ db }) => accountsMapping.all(db))
        .then(accounts => accounts.map(expandAccount));


