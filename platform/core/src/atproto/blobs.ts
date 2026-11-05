import { createHash } from 'node:crypto';
import { sha256RawToCid } from '@atproto/common';
import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { pgDb } from '../db/pg/client';
import { nowIso } from '../db/pg/mappers';
import { atBlobs } from '../db/pg/schema/documents';
import { mediaStorage } from '../media';

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
  const db = pgDb();
  return db
    .select({ cid: atBlobs.cid })
    .from(atBlobs)
    .where(and(eq(atBlobs.did, did), isNull(atBlobs.deletedAt)));
};

export const readBlobBytes = async (cid: string) => {
  const row = await findBlob(cid);
  if (!row) return null;
  const storage = await mediaStorage();
  const data = await storage.getData(row.mediaId);
  return {
    bytes: new Uint8Array(data),
    mimeType: row.mimeType,
  };
};
