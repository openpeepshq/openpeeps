import { eq } from 'drizzle-orm';
import { logger } from '../log';
import { pgDb } from './pg/client';
import { asTable, getTableForCollection } from './pg/map/registry';

const log = logger('db:replaceHostname');

const hostnameCollections = [
  'configs',
  'entries',
  'jamEvents',
  'mediaAttachments',
  'profiles',
] as const;

const absoluteHttpUrlPattern = /https?:\/\/[^\s"'<>`]+/g;

const replaceHostnameInUrl = (
  urlValue: string,
  oldHostname: string,
  newHostname: string,
) => {
  try {
    const url = new URL(urlValue);

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.hostname !== oldHostname
    ) {
      return urlValue;
    }

    const authorityStart = urlValue.indexOf('://') + 3;
    const afterAuthority = urlValue.slice(authorityStart).search(/[/?#]/);
    const authorityEnd =
      afterAuthority === -1 ? urlValue.length : authorityStart + afterAuthority;
    const authority = urlValue.slice(authorityStart, authorityEnd);
    const hostStart = authority.lastIndexOf('@') + 1;
    const updatedAuthority =
      authority.slice(0, hostStart) +
      authority.slice(hostStart).replace(oldHostname, newHostname);

    return (
      urlValue.slice(0, authorityStart) +
      updatedAuthority +
      urlValue.slice(authorityEnd)
    );
  } catch {
    return urlValue;
  }
};

const replaceHostnameInUrls = (
  value: string,
  oldHostname: string,
  newHostname: string,
) =>
  value.replace(absoluteHttpUrlPattern, (urlValue) =>
    replaceHostnameInUrl(urlValue, oldHostname, newHostname),
  );

const replaceInValue = (
  value: unknown,
  oldHostname: string,
  newHostname: string,
): unknown => {
  if (typeof value === 'string') {
    return replaceHostnameInUrls(value, oldHostname, newHostname);
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceInValue(item, oldHostname, newHostname));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceInValue(item, oldHostname, newHostname),
      ]),
    );
  }

  return value;
};

export const replaceHostname = async (
  oldHostname?: string,
  newHostname?: string,
) => {
  if (!oldHostname || !newHostname || oldHostname === newHostname) {
    log.info('No hostname to replace');
    return;
  }

  log.info(`Replacing restored hostname ${oldHostname} with ${newHostname}`);

  const db = pgDb();

  for (const collectionName of hostnameCollections) {
    const table = getTableForCollection(collectionName);
    const rows = await db.select().from(table as never);
    let replacedCount = 0;

    for (const row of rows) {
      const current = row as Record<string, unknown>;
      const updated = replaceInValue(
        current,
        oldHostname,
        newHostname,
      ) as Record<string, unknown>;

      if (JSON.stringify(current) === JSON.stringify(updated)) {
        continue;
      }

      const t = asTable(table);
      if (collectionName === 'configs') {
        await db
          .update(table as never)
          .set(updated as never)
          .where(eq(t.key as never, current.key as string));
      } else {
        await db
          .update(table as never)
          .set(updated as never)
          .where(eq(t.id as never, current.id as string));
      }

      replacedCount += 1;
    }

    if (replacedCount > 0) {
      log.info(
        `Replaced hostname in ${replacedCount} ${collectionName} row(s)`,
      );
    }
  }
};
