import type { Express, Request, Response } from 'express';
import {
  buildDidDocument,
  buildInstanceDidDocument,
  handleFromAtHandle,
  loadLocalAtprotoIdentity,
} from '@openpeepshq/core/atproto';
import { config } from '@openpeepshq/core/config';

const sendJson = (res: Response, body: unknown) => {
  res.setHeader('content-type', 'application/did+ld+json');
  res.json(body);
};

export const mountWellKnown = (app: Express) => {
  app.get('/.well-known/did.json', async (_req, res) => {
    const domain = (await config()).atproto.handleDomain;
    sendJson(res, buildInstanceDidDocument(domain));
  });

  app.get('/.well-known/atproto-did', async (req, res) => {
    const domain = (await config()).atproto.handleDomain;
    const host = (req.hostname || '').toLowerCase();
    const label = handleFromAtHandle(host, domain);
    if (!label) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }
    const identity = await loadLocalAtprotoIdentity(label);
    if (!identity) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }
    res.type('text/plain').send(identity.did);
  });

  app.get('/atproto/users/:handle/did.json', async (req, res) => {
    const domain = (await config()).atproto.handleDomain;
    const identity = await loadLocalAtprotoIdentity(req.params.handle);
    if (!identity) {
      res.status(404).json({ error: 'NotFound', message: 'Unknown handle' });
      return;
    }
    sendJson(
      res,
      buildDidDocument({
        did: identity.did,
        handle: identity.handle,
        domain,
        publicKeyDid: identity.publicKeyDid,
      }),
    );
  });

  app.get('/.well-known/oauth-authorization-server', async (_req, res) => {
    const domain = (await config()).atproto.handleDomain;
    const issuer = `https://${domain}`;
    res.json({
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      jwks_uri: `${issuer}/oauth/jwks`,
      scopes_supported: ['atproto', 'transition:generic'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      dpop_signing_alg_values_supported: ['ES256'],
    });
  });

  app.get('/.well-known/oauth-protected-resource', async (_req, res) => {
    const domain = (await config()).atproto.handleDomain;
    const issuer = `https://${domain}`;
    res.json({
      resource: issuer,
      authorization_servers: [issuer],
    });
  });
};

export const hostLabel = (req: Request) => req.hostname;
