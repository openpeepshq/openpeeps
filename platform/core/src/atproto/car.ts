import type { Keypair } from '@atproto/crypto';
import type { RepoRecord } from '@atproto/lexicon';
import {
  MemoryBlockstore,
  Repo,
  WriteOpAction,
  blocksToCarFile,
  readCarWithRoot,
} from '@atproto/repo';
import type { RecordCreateOp } from '@atproto/repo';
import { importAtprotoKeyPair } from './identity';

export type ProjectableRecord = {
  collection: string;
  rkey: string;
  record: RepoRecord;
};

export const buildSignedRepoCar = async (input: {
  did: string;
  privateKey: string;
  records: ProjectableRecord[];
}) => {
  const keypair: Keypair = await importAtprotoKeyPair(input.privateKey);
  const storage = new MemoryBlockstore();
  const writes: RecordCreateOp[] = input.records.map((row) => ({
    action: WriteOpAction.Create,
    collection: row.collection,
    rkey: row.rkey,
    record: row.record,
  }));
  const repo = await Repo.create(storage, input.did, keypair, writes);
  const car = await blocksToCarFile(repo.cid, storage.blocks);
  return {
    car,
    commitCid: repo.cid.toString(),
    rev: repo.commit.rev,
    prev: repo.commit.prev?.toString() ?? null,
  };
};

export const verifyRepoCar = async (bytes: Uint8Array) => {
  const { root, blocks } = await readCarWithRoot(bytes);
  const storage = new MemoryBlockstore(blocks);
  const repo = await Repo.load(storage, root);
  return {
    did: repo.did,
    commitCid: repo.cid.toString(),
    rev: repo.commit.rev,
  };
};
