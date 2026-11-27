import type { Request, Router } from 'express';
import express from 'express';
import { config } from '@openpeepshq/core/config';
import {
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
  getRepoCarStream,
  getRepoStatus,
  handleTxtRecord,
  listBlobsForDid,
  listRecords,
  listRepos,
  loadLocalAtprotoIdentity,
  readBlobBytes,
  requestRelayCrawl,
} from '@openpeepshq/core/atproto';
import { invalidRequest, notFound } from './errors';

const asString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const query = (req: Request, key: string) => asString(req.query[key]);

// Parse a numeric query param, falling back to `fallback` for missing or
// non-finite values (`?limit=abc` would otherwise yield NaN that survives
// the downstream `Math.min(n, 100)` clamp).
const limitQuery = (req: Request, key: string, fallback: number) => {
  const n = Number(query(req, key) ?? fallback);
  return Number.isFinite(n) ? n : fallback;
};

export const atprotoXrpcRouter = (): Router => {
  const router = express.Router();
  router.use(express.json());

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
    const limit = limitQuery(req, 'limit', 50);
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
    const status = await getRepoStatus(did);
    if (!status) {
      notFound(res, 'Unknown repo');
      return;
    }
    res.json(status);
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
    const since = query(req, 'since');
    const snapshot = await getRepoCarStream(did, since);
    if (!snapshot) {
      notFound(res, 'Unknown repo');
      return;
    }
    res.setHeader('content-type', 'application/vnd.ipld.car');
    res.send(Buffer.from(snapshot.car));
  });

  router.post('/com.atproto.sync.requestCrawl', async (req, res) => {
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
      await listRepos(limitQuery(req, 'limit', 50), query(req, 'cursor')),
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
    // Served bytes come from remote PDS blobs; harden the response so a
    // spoofed MIME type cannot turn into an active-content or download attack.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
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
    res.json(await getAuthorFeed(actor, limitQuery(req, 'limit', 50)));
  });

  // app.bsky.feed.getPosts bounds `uris` at 100 items (lexicon); cap the
  // client-supplied list so an oversized request cannot fan out unbounded
  // lookups.
  const MAX_POST_URIS = 100;
  router.get('/app.bsky.feed.getPosts', async (req, res) => {
    const uris = req.query.uris;
    const list = Array.isArray(uris)
      ? uris.filter((value): value is string => typeof value === 'string')
      : typeof uris === 'string'
        ? [uris]
        : [];
    res.json(await getPostsByAtUris(list.slice(0, MAX_POST_URIS)));
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

  return router;
};
