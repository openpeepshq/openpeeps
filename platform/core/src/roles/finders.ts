import { Role } from "@openpeeps/common/types";
import { allpeepDb } from "../db";
import { rolesMapping } from "./mapping";
import { checkRoleCapabilities } from "@openpeeps/common/lib";

export const findRole = (id: string): Promise<Role | undefined> =>
    allpeepDb().then(({ db }) => rolesMapping.find(db, id));

export const findRoleByKey = (key: string): Promise<Role | undefined> =>
    allpeepDb().then(({ db }) => rolesMapping.findOneBy(db, { matches: { key } }));

export const listRoles = (): Promise<Role[]> =>
    allpeepDb().then(({ db }) => rolesMapping.all(db));

export const findRolesByCapabilities = (capabilities: string[]): Promise<Role[]> =>
    allpeepDb().then(({ db }) => rolesMapping.all(db)).then(roles => roles.filter((role) => checkRoleCapabilities([role], capabilities).success));