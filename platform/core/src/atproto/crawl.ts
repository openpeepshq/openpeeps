import { config } from '../config';
import { logger } from '../log';

const log = logger('app:atproto:crawl');

export const requestRelayCrawl = async (hostname?: string) => {
  const cfg = await config();
  if (!cfg.atproto.active) {
    throw new Error('atproto is inactive');
  }
  const host = hostname ?? cfg.atproto.handleDomain;
  const relay = cfg.atproto.relayUrl ?? 'https://bsky.network';
  const url = `${relay.replace(/\/$/, '')}/xrpc/com.atproto.sync.requestCrawl`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hostname: host }),
  });
  if (!response.ok) {
    const body = await response.text();
    log.error(`requestCrawl failed ${response.status}: ${body}`);
    throw new Error(`requestCrawl failed: ${response.status}`);
  }
  log.info(`Requested crawl of ${host} at ${relay}`);
  return { hostname: host, relay };
};

export const handleTxtRecord = (did: string) => `did=${did}`;

export const handleTxtName = (atHandle: string) => `_atproto.${atHandle}`;
