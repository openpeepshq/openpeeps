import type { Keypair } from '@atproto/crypto';
import type { RepoRecord } from '@atproto/lexicon';
import type { CID } from 'multiformats/cid';
import {
  BlockMap,
  MemoryBlockstore,
  Repo,
  WriteOpAction,
  blocksToCarFile,
  readCarWithRoot,
} from '@atproto/repo';
import type { RecordCreateOp, RecordWriteOp } from '@atproto/repo';
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

export const buildSignedRepoCarIncremental = async (input: {
  did: string;
  privateKey: string;
  previousCar: Uint8Array;
  writes: RecordWriteOp[];
}): Promise<{
  car: Uint8Array;
  fullCar: Uint8Array;
  commitCid: string;
  rev: string;
  prev: string | null;
}> => {
  const keypair: Keypair = await importAtprotoKeyPair(input.privateKey);
  const { root, blocks } = await readCarWithRoot(input.previousCar);
  const storage = new MemoryBlockstore(blocks);
  const repo = await Repo.load(storage, root);
  // formatCommit (not applyWrites) exposes the CommitData the diff CAR is
  // built from: newBlocks is the new record + MST nodes and the commit block,
  // relevantBlocks the proof blocks a subscriber still needs to resolve the
  // commit's data pointer.
  const commitData = await repo.formatCommit(input.writes, keypair);
  // Persist the commit into the in-memory repo: validates the new commit
  // loads back cleanly before we build the CARs from it.
  await repo.applyCommit(commitData);
  // The commit CAR carries only the blocks of this commit — the wire format
  // for subscribeRepos. The full CAR merges the previous repo's blocks with
  // the new ones so getRepo always serves a complete, importable archive.
  const diff = new BlockMap();
  for (const [cid, bytes] of commitData.relevantBlocks) diff.set(cid, bytes);
  const car = await blocksToCarFile(commitData.cid, diff);
  const full = new BlockMap();
  for (const [cid, bytes] of blocks) full.set(cid, bytes);
  for (const [cid, bytes] of commitData.newBlocks) full.set(cid, bytes);
  const fullCar = await blocksToCarFile(commitData.cid, full);
  return {
    car,
    fullCar,
    commitCid: commitData.cid.toString(),
    rev: commitData.rev,
    prev: commitData.prev?.toString() ?? null,
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

// CID of the commit block at the root of a stored commit CAR.
export const readRepoRootCid = async (bytes: Uint8Array) => {
  try {
    const { root, blocks } = await readCarWithRoot(bytes);
    if (!blocks.has(root)) return null;
    return root;
  } catch {
    return null;
  }
};

// Every block of a commit CAR (commit + MST nodes + records) that belongs in
// a repo read. getRepo serializes them back into a CAR with the same root.
export const collectCommitBlockCids = async (bytes: Uint8Array) => {
  const { blocks } = await readCarWithRoot(bytes);
  return [...blocks.cids()];
};

// Writes a CAR containing only `cids` from `bytes`, as a stream. Reads
// incrementally instead of materialising the whole archive.
export const readRepoBlocks = async (bytes: Uint8Array, cids: CID[]) => {
  const { blocks } = await readCarWithRoot(bytes);
  const subset = new BlockMap();
  for (const cid of cids) {
    const value = blocks.get(cid);
    if (value) subset.set(cid, value);
  }
  return blocksToCarFile(cids[0], subset);
};
