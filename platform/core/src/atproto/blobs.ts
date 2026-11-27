import { createHash } from 'node:crypto';
import { sha256RawToCid } from '@atproto/common';
import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { pgDb } from '../db/pg/client';
import { nowIso } from '../db/pg/mappers';
import { atBlobs } from '../db/pg/schema/documents';
import { config } from '../config';
import { mediaStorage } from '../media';
import { mediaUploadLimitBytes } from '@openpeepshq/common';
import { isLocalProfileActive } from './identity';

export const cidForBytes = async (bytes: Uint8Array) =>
  sha256RawToCid(createHash('sha256').update(bytes).digest()).toString();

export const storeBlob = async (input: {
  did: string;
  bytes: Uint8Array;
  mimeType?: string;
  mediaUrl?: string;
}) => {
  const cid = await cidForBytes(input.bytes);
  const db = pgDb();
  const [existing] = await db
    .select({
      cid: atBlobs.cid,
      mediaId: atBlobs.mediaId,
      mimeType: atBlobs.mimeType,
    })
    .from(atBlobs)
    .where(and(eq(atBlobs.cid, cid), isNull(atBlobs.deletedAt)))
    .limit(1);
  if (existing) return existing;

  const storage = await mediaStorage();
  const copy = new Uint8Array(input.bytes.byteLength);
  copy.set(input.bytes);
  const mediaId = await storage.store(copy.buffer);
  await db.insert(atBlobs).values({
    id: uuidv7(),
    cid,
    did: input.did,
    mediaId,
    mimeType: input.mimeType ?? null,
    body: input.mediaUrl ? { url: input.mediaUrl } : { mediaId },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  return { cid, mediaId, mimeType: input.mimeType ?? null };
};

export const findBlob = async (cid: string) => {
  const db = pgDb();
  const [row] = await db
    .select()
    .from(atBlobs)
    .where(and(eq(atBlobs.cid, cid), isNull(atBlobs.deletedAt)))
    .limit(1);
  return row ?? null;
};

export const listBlobsForDid = async (did: string) => {
  if (!(await isLocalProfileActive(did))) return [];
  const db = pgDb();
  return db
    .select({ cid: atBlobs.cid })
    .from(atBlobs)
    .where(and(eq(atBlobs.did, did), isNull(atBlobs.deletedAt)));
};

export const readBlobBytes = async (cid: string) => {
  const row = await findBlob(cid);
  if (!row) return null;
  // Blobs carry no visibility of their own; a deleted owner's media must not
  // stay fetchable by CID either (round-14 review).
  if (!(await isLocalProfileActive(row.did))) return null;
  const storage = await mediaStorage();
  const data = await storage.getData(row.mediaId);
  return {
    bytes: new Uint8Array(data),
    mimeType: row.mimeType,
  };
};

// Media lives in the shared media store keyed by its own SHA-256; the AT
// blob CID is the CID of that same content, so a stored attachment is
// already content-addressed under both schemes and re-processing a note
// dedupes to the existing blob row.
const mediaKeyFromUrl = (url: string) => {
  try {
    const { pathname } = new URL(url);
    const match = pathname.match(/\/allpeep\/([^/]+)\//);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

export const storeMediaAttachmentBlob = async (
  did: string,
  attachment: {
    url: string;
    filename?: string;
    meta?: { mimetype?: string };
  },
) => {
  const mediaId = mediaKeyFromUrl(attachment.url);
  if (!mediaId) return null;
  const storage = await mediaStorage();
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await storage.getData(mediaId));
  } catch {
    return null;
  }
  // Bound the projection's memory: a stored attachment larger than the
  // configured local upload limit cannot have entered through the normal
  // upload path, so it is skipped instead of ballooning the worker.
  const { media } = await config();
  if (bytes.byteLength > mediaUploadLimitBytes(media.maxUploadMb)) {
    return null;
  }
  return storeBlob({
    did,
    bytes,
    mimeType: attachment.meta?.mimetype,
    mediaUrl: attachment.url,
  });
};
