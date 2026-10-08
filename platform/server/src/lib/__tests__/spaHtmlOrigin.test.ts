import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Request, Response } from 'express';
import type { CommunityConfig } from '@openpeepshq/common/types';

const { serverRootUrl } = vi.hoisted(() => ({
  serverRootUrl: vi.fn(async () => 'https://peeps.example'),
}));

vi.mock('@openpeepshq/core/server', () => ({ serverRootUrl }));
vi.mock('@openpeepshq/core/config', () => ({
  communityConfig: async () =>
    ({
      info: { name: 'Echo Community', tagLine: 'A place for echoes' },
      theme: {
        icon: '/img/icon.svg',
        light: { primaryHex: '#112233', logoSmall: '/img/logo-small.png' },
      },
    }) as CommunityConfig,
}));

import { sendSpaHtml } from '../spaHtml';

const TEMPLATE =
  '<html><head><title>{{name}}</title>' +
  '<link rel="canonical" href="{{pageUrl}}" />' +
  '<meta property="og:url" content="{{pageUrl}}" />' +
  '<meta property="og:image" content="{{imageUrl}}" />' +
  '</head><body></body></html>';

const writeTemplate = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'spa-origin-'));
  const path = join(dir, 'index.html');
  await writeFile(path, TEMPLATE);
  return path;
};

/** Request as a hostile proxy might deliver it: attacker host, claimed https. */
const hostileRequest = (originalUrl = '/posts/abc'): Request =>
  ({
    originalUrl,
    protocol: 'http',
    headers: { 'x-forwarded-proto': 'https' },
    get: (name: string) => (name === 'host' ? 'evil.example' : undefined),
  }) as unknown as Request;

const captureResponse = (): { res: Response; body: () => string } => {
  let body = '';
  const res = {
    type: () => res,
    set: () => res,
    send: (html: string) => {
      // Mustache entity-escapes slashes in attributes; decode for matching.
      body = html.replace(/&#x2F;/g, '/');
      return res;
    },
    status: () => res,
  } as unknown as Response;
  return { res, body: () => body };
};

describe('sendSpaHtml crawler origin pinning', () => {
  it('pins canonical and og:url to the configured origin, not the Host header', async () => {
    serverRootUrl.mockImplementation(async () => 'https://peeps.example');
    const { res, body } = captureResponse();
    await sendSpaHtml(await writeTemplate(), hostileRequest(), res);
    expect(body()).toContain('https://peeps.example/posts/abc');
    expect(body()).not.toContain('evil.example');
  });

  it('keeps the configured scheme even when the request claims another one', async () => {
    serverRootUrl.mockImplementation(async () => 'http://localhost:5174');
    const { res, body } = captureResponse();
    await sendSpaHtml(
      await writeTemplate(),
      hostileRequest('/groups/@jam'),
      res,
    );
    expect(body()).toContain('http://localhost:5174/groups/@jam');
    expect(body()).not.toContain('https://');
  });

  it('absolutizes the community image on the pinned origin', async () => {
    serverRootUrl.mockImplementation(async () => 'https://peeps.example');
    const { res, body } = captureResponse();
    await sendSpaHtml(await writeTemplate(), hostileRequest(), res);
    expect(body()).toContain(
      'content="https://peeps.example/img/logo-small.png"',
    );
  });
});
