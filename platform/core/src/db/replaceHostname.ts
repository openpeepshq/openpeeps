import { aql, Database } from 'arangojs';
import { logger } from '../log';

const log = logger('db:replaceHostname');

const hostnameCollections = [
  'configs',
  'entries',
  'jamEvents',
  'mediaAttachments',
  'profiles',
];

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
  db: Database,
  oldHostname?: string,
  newHostname?: string,
) => {
  if (!oldHostname || !newHostname || oldHostname === newHostname) {
    log.info(`No hostname to replace`);
    return;
  }

  log.info(`Replacing restored hostname ${oldHostname} with ${newHostname}`);

  for (const collectionName of hostnameCollections) {
    const collection = db.collection(collectionName);

    if (!(await collection.exists())) {
      continue;
    }

    const cursor = await db.query(aql`
      FOR doc IN ${collection}
        RETURN doc
    `);
    let replacedCount = 0;

    for await (const doc of cursor) {
      const updatedDoc = replaceInValue(doc, oldHostname, newHostname);

      if (JSON.stringify(doc) === JSON.stringify(updatedDoc)) {
        continue;
      }

      await collection.replace(doc._key, updatedDoc);
      replacedCount += 1;
    }

    if (replacedCount > 0) {
      log.info(
        `Replaced hostname in ${replacedCount} ${collectionName} document(s)`,
      );
    }
  }
};
