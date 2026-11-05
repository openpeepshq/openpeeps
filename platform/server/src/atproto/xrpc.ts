import type { Request, Response, Router } from 'express';
import express from 'express';
import { checkPassword, findByProfile } from '@openpeepshq/core/accounts';
import { config } from '@openpeepshq/core/config';
import { findProfile } from '@openpeepshq/core/profiles';
import {
  ATPROTO_ACCESS_SCOPE,
  createAtprotoTokens,
  describeRepo,
  getAuthorFeed,
  getFollowers,
  getFollows,
  getLatestCommit,
  getPostThread,
  getPostsByAtUris,
  getProfileView,
  getProfileViews,
  getRecord,
  getRelationships,
  getRepoCar,
  handleTxtRecord,
  listBlobsForDid,
  listRecords,
  listRepos,
  loadLocalAtprotoIdentity,
  readBlobBytes,
  requestRelayCrawl,
  verifyAtprotoRefresh,
} from '@openpeepshq/core/atproto';
import { authRequired, invalidRequest, notFound } from './errors';
import { requireAtprotoSession } from './auth';
import {
  createRecordForSession,
  deleteRecordForSession,
  uploadBlobForSession,
  WRITE_COLLECTIONS,
} from './writes';

const asString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const query = (req: Request, key: string) => asString(req.query[key]);

export const atprotoXrpcRouter = (): Router => {
  const router = express.Router();
  router.use((req, res, next) => {
    if (req.path === '/com.atproto.repo.uploadBlob') {
      next();
      return;
    }
    express.json()(req, res, next);
  });

  router.get('/com.atproto.server.describeServer', async (_req, res) => {
    const domain = (await config()).atproto.handleDomain;
    res.json({
      availableUserDomains: [`.${domain}`],
      inviteCodeRequired: false,
    });
  });

  router.get('/com.atproto.identity.resolveHandle', async (req, res) => {
    const handle = query(req, 'handle');
    if (!handle) {
      invalidRequest(res, 'handle required');
      return;
    }
    const identity = await loadLocalAtprotoIdentity(handle);
    if (!identity) {
      notFound(res, 'Unknown handle');
      return;
    }
    res.json({ did: identity.did });
  });

  router.get('/com.atproto.repo.describeRepo', async (req, res) => {
    const repo = query(req, 'repo');
    if (!repo) {
      invalidRequest(res, 'repo required');
      return;
    }
    const described = await describeRepo(repo);
    if (!described) {
      notFound(res, 'Unknown repo');
      return;
    }
    res.json(described);
  });

  router.get('/com.atproto.repo.getRecord', async (req, res) => {
    const repo = query(req, 'repo');
    const collection = query(req, 'collection');
    const rkey = query(req, 'rkey');
    if (!repo || !collection || !rkey) {
      invalidRequest(res, 'repo, collection, and rkey required');
      return;
    }
    const record = await getRecord(repo, collection, rkey);
    if (!record) {
      notFound(res, 'Unknown record');
      return;
    }
    res.json(record);
  });

  router.get('/com.atproto.repo.listRecords', async (req, res) => {
    const repo = query(req, 'repo');
    const collection = query(req, 'collection');
    if (!repo || !collection) {
      invalidRequest(res, 'repo and collection required');
      return;
    }
    const limit = Number(query(req, 'limit') ?? '50');
    res.json(await listRecords(repo, collection, limit, query(req, 'cursor')));
  });

  router.get('/com.atproto.sync.getLatestCommit', async (req, res) => {
    const did = query(req, 'did');
    if (!did) {
      invalidRequest(res, 'did required');
      return;
    }
    const commit = await getLatestCommit(did);
    if (!commit) {
      notFound(res, 'Unknown repo');
      return;
    }
    res.json(commit);
  });

  router.get('/com.atproto.sync.getRepoStatus', async (req, res) => {
    const did = query(req, 'did');
    if (!did) {
      invalidRequest(res, 'did required');
      return;
    }
    const commit = await getLatestCommit(did);
    res.json({
      did,
      active: commit != null,
      ...(commit ? { rev: commit.rev } : { status: 'takendown' }),
    });
  });

  router.get('/com.atproto.sync.getRecord', async (req, res) => {
    const did = query(req, 'did');
    const collection = query(req, 'collection');
    const rkey = query(req, 'rkey');
    if (!did || !collection || !rkey) {
      invalidRequest(res, 'did, collection, and rkey required');
      return;
    }
    const record = await getRecord(did, collection, rkey);
    if (!record) {
      notFound(res, 'Unknown record');
      return;
    }
    res.json(record);
  });

  router.get('/com.atproto.sync.getRepo', async (req, res) => {
    const did = query(req, 'did');
    if (!did) {
      invalidRequest(res, 'did required');
      return;
    }
    const snapshot = await getRepoCar(did);
    if (!snapshot) {
      notFound(res, 'Unknown repo');
      return;
    }
    res.setHeader('content-type', 'application/vnd.ipld.car');
    res.send(Buffer.from(snapshot.car));
  });

  router.post('/com.atproto.sync.requestCrawl', async (req, res) => {
    const claims = await requireAtprotoSession(req, res);
    if (!claims) return;
    const hostname = asString(req.body?.hostname);
    try {
      res.json(await requestRelayCrawl(hostname));
    } catch (error: unknown) {
      invalidRequest(
        res,
        error instanceof Error ? error.message : 'requestCrawl failed',
      );
    }
  });

  router.get('/com.atproto.identity.getHandleTxt', async (req, res) => {
    const handle = query(req, 'handle');
    if (!handle) {
      invalidRequest(res, 'handle required');
      return;
    }
    const identity = await loadLocalAtprotoIdentity(handle);
    if (!identity) {
      notFound(res, 'Unknown handle');
      return;
    }
    res.json({
      name: `_atproto.${identity.atHandle}`,
      value: handleTxtRecord(identity.did),
    });
  });

  router.get('/com.atproto.sync.listRepos', async (req, res) => {
    res.json(
      await listRepos(
        Number(query(req, 'limit') ?? '50'),
        query(req, 'cursor'),
      ),
    );
  });

  router.get('/com.atproto.sync.listBlobs', async (req, res) => {
    const did = query(req, 'did');
    if (!did) {
      invalidRequest(res, 'did required');
      return;
    }
    const cids = await listBlobsForDid(did);
    res.json({ cids: cids.map((row) => row.cid) });
  });

  router.get('/com.atproto.sync.getBlob', async (req, res) => {
    const cid = query(req, 'cid');
    if (!cid) {
      invalidRequest(res, 'cid required');
      return;
    }
    const blob = await readBlobBytes(cid);
    if (!blob) {
      notFound(res, 'Unknown blob');
      return;
    }
    res.setHeader('content-type', blob.mimeType ?? 'application/octet-stream');
    res.send(Buffer.from(blob.bytes));
  });

  router.get('/app.bsky.actor.getProfile', async (req, res) => {
    const actor = query(req, 'actor');
    if (!actor) {
      invalidRequest(res, 'actor required');
      return;
    }
    const view = await getProfileView(actor);
    if (!view) {
      notFound(res, 'Unknown actor');
      return;
    }
    res.json(view);
  });

  router.get('/app.bsky.actor.getProfiles', async (req, res) => {
    const actors = req.query.actors;
    const list = Array.isArray(actors)
      ? actors.filter((value): value is string => typeof value === 'string')
      : typeof actors === 'string'
        ? [actors]
        : [];
    res.json({ profiles: await getProfileViews(list) });
  });

  router.get('/app.bsky.feed.getAuthorFeed', async (req, res) => {
    const actor = query(req, 'actor');
    if (!actor) {
      invalidRequest(res, 'actor required');
      return;
    }
    res.json(await getAuthorFeed(actor, Number(query(req, 'limit') ?? '50')));
  });

  router.get('/app.bsky.feed.getPosts', async (req, res) => {
    const uris = req.query.uris;
    const list = Array.isArray(uris)
      ? uris.filter((value): value is string => typeof value === 'string')
      : typeof uris === 'string'
        ? [uris]
        : [];
    res.json(await getPostsByAtUris(list));
  });

  router.get('/app.bsky.feed.getPostThread', async (req, res) => {
    const uri = query(req, 'uri');
    if (!uri) {
      invalidRequest(res, 'uri required');
      return;
    }
    const thread = await getPostThread(uri);
    if (!thread) {
      notFound(res, 'Unknown thread');
      return;
    }
    res.json(thread);
  });

  router.get('/app.bsky.graph.getFollows', async (req, res) => {
    const actor = query(req, 'actor');
    if (!actor) {
      invalidRequest(res, 'actor required');
      return;
    }
    res.json(await getFollows(actor));
  });

  router.get('/app.bsky.graph.getFollowers', async (req, res) => {
    const actor = query(req, 'actor');
    if (!actor) {
      invalidRequest(res, 'actor required');
      return;
    }
    res.json(await getFollowers(actor));
  });

  router.get('/app.bsky.graph.getRelationships', async (req, res) => {
    const actor = query(req, 'actor');
    const others = req.query.others;
    const list = Array.isArray(others)
      ? others.filter((value): value is string => typeof value === 'string')
      : typeof others === 'string'
        ? [others]
        : [];
    if (!actor) {
      invalidRequest(res, 'actor required');
      return;
    }
    res.json(await getRelationships(actor, list));
  });

  router.post('/com.atproto.server.createSession', async (req, res) => {
    const identifier = asString(req.body?.identifier);
    const password = asString(req.body?.password);
    if (!identifier || !password) {
      invalidRequest(res, 'identifier and password required');
      return;
    }
    const identity = await loadLocalAtprotoIdentity(identifier);
    if (!identity) {
      authRequired(res, 'Invalid identifier or password');
      return;
    }
    const profile = await findProfile(identity.id);
    if (!profile) {
      authRequired(res, 'Invalid identifier or password');
      return;
    }
    const accounts = await findByProfile(profile);
    const account = accounts[0];
    if (!account || !(await checkPassword(account, password))) {
      authRequired(res, 'Invalid identifier or password');
      return;
    }
    const tokens = await createAtprotoTokens({
      did: identity.did,
      profileId: identity.id,
      scope: ATPROTO_ACCESS_SCOPE,
    });
    res.json({
      did: identity.did,
      handle: identity.atHandle,
      accessJwt: tokens.accessJwt,
      refreshJwt: tokens.refreshJwt,
    });
  });

  router.post('/com.atproto.server.refreshSession', async (req, res) => {
    const parsed = req.headers.authorization?.split(' ')[1];
    const claims = parsed ? await verifyAtprotoRefresh(parsed) : undefined;
    if (!claims) {
      authRequired(res, 'Invalid refresh token');
      return;
    }
    const tokens = await createAtprotoTokens(claims);
    res.json({
      did: claims.did,
      accessJwt: tokens.accessJwt,
      refreshJwt: tokens.refreshJwt,
    });
  });

  router.get('/com.atproto.server.getSession', async (req, res) => {
    const claims = await requireAtprotoSession(req, res);
    if (!claims) return;
    const identity = await loadLocalAtprotoIdentity(claims.did);
    res.json({
      did: claims.did,
      handle: identity?.atHandle,
    });
  });

  router.post('/com.atproto.repo.createRecord', async (req, res) => {
    const claims = await requireAtprotoSession(req, res);
    if (!claims) return;
    const collection = asString(req.body?.collection);
    const record = req.body?.record as Record<string, unknown> | undefined;
    if (!collection || !record) {
      invalidRequest(res, 'collection and record required');
      return;
    }
    if (!WRITE_COLLECTIONS.has(collection)) {
      invalidRequest(res, 'Collection not allowed');
      return;
    }
    try {
      const written = await createRecordForSession(claims, {
        collection,
        rkey: asString(req.body?.rkey),
        record,
      });
      res.json(written);
    } catch (error: unknown) {
      invalidRequest(
        res,
        error instanceof Error ? error.message : 'Create failed',
      );
    }
  });

  router.post('/com.atproto.repo.putRecord', (req, res) => {
    void handlePutOrCreate(req, res);
  });

  router.post('/com.atproto.repo.deleteRecord', async (req, res) => {
    const claims = await requireAtprotoSession(req, res);
    if (!claims) return;
    const collection = asString(req.body?.collection);
    const rkey = asString(req.body?.rkey);
    if (!collection || !rkey) {
      invalidRequest(res, 'collection and rkey required');
      return;
    }
    try {
      res.json(await deleteRecordForSession(claims, { collection, rkey }));
    } catch (error: unknown) {
      invalidRequest(
        res,
        error instanceof Error ? error.message : 'Delete failed',
      );
    }
  });

  router.post('/com.atproto.repo.applyWrites', async (req, res) => {
    const claims = await requireAtprotoSession(req, res);
    if (!claims) return;
    const writes = Array.isArray(req.body?.writes) ? req.body.writes : [];
    const results = [];
    try {
      for (const write of writes) {
        const type = String(write?.$type ?? '');
        if (type.endsWith('#create') || type.endsWith('#update')) {
          results.push(
            await createRecordForSession(claims, {
              collection: String(write.collection),
              rkey: write.rkey,
              record: write.value,
            }),
          );
        } else if (type.endsWith('#delete')) {
          results.push(
            await deleteRecordForSession(claims, {
              collection: String(write.collection),
              rkey: String(write.rkey),
            }),
          );
        }
      }
      res.json({ results });
    } catch (error: unknown) {
      invalidRequest(
        res,
        error instanceof Error ? error.message : 'applyWrites failed',
      );
    }
  });

  router.post(
    '/com.atproto.repo.uploadBlob',
    express.raw({ type: '*/*', limit: '20mb' }),
    async (req, res) => {
      const claims = await requireAtprotoSession(req, res);
      if (!claims) return;
      const bytes = Buffer.isBuffer(req.body)
        ? new Uint8Array(req.body)
        : new Uint8Array();
      const blob = await uploadBlobForSession(
        claims,
        bytes,
        req.headers['content-type'],
      );
      res.json({
        blob: {
          $type: 'blob',
          ref: { $link: blob.cid },
          mimeType: blob.mimeType,
        },
      });
    },
  );

  return router;
};

const handlePutOrCreate = async (req: Request, res: Response) => {
  const claims = await requireAtprotoSession(req, res);
  if (!claims) return;
  const collection = asString(req.body?.collection);
  const record = req.body?.record as Record<string, unknown> | undefined;
  if (!collection || !record) {
    invalidRequest(res, 'collection and record required');
    return;
  }
  try {
    res.json(
      await createRecordForSession(claims, {
        collection,
        rkey: asString(req.body?.rkey),
        record,
      }),
    );
  } catch (error: unknown) {
    invalidRequest(
      res,
      error instanceof Error ? error.message : 'Write failed',
    );
  }
};
