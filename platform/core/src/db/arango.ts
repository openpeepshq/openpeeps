import { Database } from 'arangojs';
import type { ConfigOptions } from 'arangojs/configuration';
import { defaultConfig } from '../config/defaults/core';
import { ArangoError } from 'arangojs/errors';
import { logger } from '../log';
import { sleep } from '@openpeeps/common/lib';

const log = logger('allpeep:db');

const DB_AVAILABILITY_TIMEOUT = 10000;

let dbPromise: Promise<Database>;

const handleArangoError =
    (method: string, params: unknown[]) => (e: unknown) => {
        if (e instanceof ArangoError) {
            if (method === 'query') {
                log.error('===============================');
                log.error('===============================');
                // @ts-expect-error type guaranteed because of method name
                if (params[0].query && typeof params[0].query === 'string') {
                    // @ts-expect-error type guaranteed because of method name
                    const queryText: string = params[0].query;
                    log.error(queryText.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n'));
                    // @ts-expect-error type guaranteed because of method name
                    log.error(params[0].bindVars);
                    log.error('querylength', queryText.length);
                }
                log.error('===============================');
                log.error(e.message);
                log.error('===============================');

                throw new Error(e.message);
            }

            throw {
                request: {
                    method,
                    params,
                },
                response: e.response?.body,
            };
        } else {
            throw e;
        }
    };


const waitForDatabase = async (config: ConfigOptions) => {
    const start = Date.now();
    const database = new Database(config);

    let tryCount = 1;
    while (true) {

        log.info(`Checking ArangoDB availability at ${config.url} (try ${tryCount})`);
        const availability = await database.availability(true).catch((e) => {
            return false;
        });
        if (availability) {
            log.info(`ArangoDB is available at ${config.url}`);
            break;
        }
        if (Date.now() - start > DB_AVAILABILITY_TIMEOUT) {
            log.error(`ArangoDB is not available at ${config.url} after ${DB_AVAILABILITY_TIMEOUT}ms`);
            process.exit(1);
        }
        await sleep(1);
        tryCount++;
    }
};
const initArangoDb = async () => {
    const config = defaultConfig.db;

    await waitForDatabase(config);

    if (config.databaseName) {
        log.info(`Using database "${config.databaseName}"`);
        const systemDb = new Database({ ...config, databaseName: '_system' });
        if (!(await systemDb.database(config.databaseName).exists())) {
            log.info(`Creating database "${config.databaseName}"`);
            await systemDb.createDatabase(config.databaseName);
        }
    } else {
        log.info('Using default database');
    }

    return new Proxy(new Database(defaultConfig.db), {
        get: (target, propertyName: keyof Database) => {
            const property = target[propertyName];
            if (typeof property === 'function') {
                const decoratedFunction = (...args: Parameters<typeof property>) => {
                    try {
                        // @ts-expect-error typing is guaranteed to be correct
                        const result = target[propertyName](...args);

                        if (result instanceof Promise) {
                            return result.catch(handleArangoError(propertyName, args));
                        } else {
                            return result;
                        }
                    } catch (e) {
                        handleArangoError(propertyName, args)(e);
                    }
                };
                return decoratedFunction.bind(target);
            } else {
                return target[propertyName];
            }
        },
    });
};

export const arangoDb = async () => {
    if (!dbPromise) {
        dbPromise = initArangoDb();
    }
    return dbPromise;
};