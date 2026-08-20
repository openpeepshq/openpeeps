import { eq } from 'drizzle-orm';
import { logger } from '../log';
import { pgDb } from './pg/client';
import { asTable, getTableForCollection } from './pg/map/registry';

const log = logger('db:replaceOrigin');

// Walk collections that embed absolute media URLs (avatar/header/image,
// denormalized attachments, jam backgrounds). posts covers articles + events;
// groups covers group avatar/header — omitting them leaves those on the backup host.
const hostnameCollections = [
  'configs',
  'entries',
  'groups',
  'jamEvents',
  'mediaAttachments',
  'posts',
  'profileSettings',
  'profiles',
] as const;

const absoluteHttpUrlPattern = /https?:\/\/[^\s"'<>`]+/g;

/**
 * Rewrite the origin (scheme + host + port) of a single URL when its hostname
 * matches the backup's origin. Matching by hostname — rather than the full
 * origin — lets a backup taken on `https://community.example` restore onto a
 * `http://localhost:5174` dev server: the old scheme/port are dropped and the
 * current server's origin takes their place. Path, query, hash, and any
 * userinfo are preserved verbatim (no URL normalization).
 */
const replaceOriginInUrl = (
  urlValue: string,
  oldHostname: string,
  newOrigin: string,
): string => {
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
    const userinfo = authority.slice(0, authority.lastIndexOf('@') + 1);
    const rest = urlValue.slice(authorityEnd);

    const newOriginTrimmed = newOrigin.replace(/\/+$/, '');
    if (userinfo) {
      const newAuthorityStart = newOriginTrimmed.indexOf('://') + 3;
      return (
        newOriginTrimmed.slice(0, newAuthorityStart) +
        userinfo +
        newOriginTrimmed.slice(newAuthorityStart) +
        rest
      );
    }
    return newOriginTrimmed + rest;
  } catch {
    return urlValue;
  }
};

const replaceOriginInString = (
  value: string,
  oldHostname: string,
  newOrigin: string,
): string =>
  value.replace(absoluteHttpUrlPattern, (urlValue) =>
    replaceOriginInUrl(urlValue, oldHostname, newOrigin),
  );

/**
 * Recursively rewrite every absolute http(s) URL under `value` whose hostname
 * matches `oldHostname` so it points at `newOrigin`. Pure — exported for tests.
 */
export const replaceOriginInValue = (
  value: unknown,
  oldHostname: string,
  newOrigin: string,
): unknown => {
  if (typeof value === 'string') {
    return replaceOriginInString(value, oldHostname, newOrigin);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      replaceOriginInValue(item, oldHostname, newOrigin),
    );
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceOriginInValue(item, oldHostname, newOrigin),
      ]),
    );
  }

  return value;
};

/**
 * After a restore, repoint stored absolute URLs from the backup's origin to the
 * current server. `oldHostname` comes from the backup metadata; `newOrigin` is
 * this server's `serverRootUrl()` (scheme + host + port).
 */
export const replaceOrigin = async (
  oldHostname?: string,
  newOrigin?: string,
) => {
  if (!oldHostname || !newOrigin) {
    log.info('No origin to replace');
    return;
  }

  log.info(`Repointing restored URLs from ${oldHostname} to ${newOrigin}`);

  const db = pgDb();

  for (const collectionName of hostnameCollections) {
    const table = getTableForCollection(collectionName);
    const rows = await db.select().from(table as never);
    let replacedCount = 0;

    for (const row of rows) {
      const current = row as Record<string, unknown>;
      const updated = replaceOriginInValue(
        current,
        oldHostname,
        newOrigin,
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
      log.info(`Repointed URLs in ${replacedCount} ${collectionName} row(s)`);
    }
  }
};
