import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export const DOCUMENT_IMPORT_ORDER = [
  'configs',
  'i18n',
  'accounts',
  'roles',
  'profiles',
  'groups',
  'hashtags',
  'posts',
  'notifications',
  'reports',
  'accessTokens',
  'pushSubscriptions',
  'inviteLinks',
  'jamEvents',
  'mediaAttachments',
  'processingStats',
  'profileSettings',
] as const;

export const EDGE_IMPORT_ORDER = [
  'controls',
  'follows',
  'requestsFollow',
  'mentions',
  'audience',
  'postHashtags',
  'entries',
  'replyTo',
  'repost',
  'bookmarks',
  'postSeen',
  'hasSeen',
  'hasRead',
  'userGroups',
  'postGroups',
  'hasRole',
  'profileAccessTokens',
  'accountToPushSubscription',
  'createdReport',
  'isReportedProfile',
  'isReportedObject',
  'inviteLinkCreators',
  'inviteLinkRedeemers',
  'jamRecordings',
] as const;

export const readJsonl = async (
  filePath: string,
): Promise<Record<string, unknown>[]> => {
  const docs: Record<string, unknown>[] = [];
  let buffer = '';

  const lineReader = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of lineReader) {
    if (!line.trim()) {
      continue;
    }
    buffer += line;
    try {
      docs.push(JSON.parse(buffer) as Record<string, unknown>);
      buffer = '';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const partialJson =
        message.includes('Unexpected end of JSON input') ||
        message.includes('Unterminated string') ||
        message.includes('Unexpected token');
      if (!partialJson) {
        throw err;
      }
    }
  }

  if (buffer.trim().length > 0) {
    throw new Error(`Unparsed JSON remaining in ${filePath}`);
  }

  return docs;
};

export const BATCH_SIZE = 500;
