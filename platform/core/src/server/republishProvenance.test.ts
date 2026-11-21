import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config', () => ({
  config: vi.fn(),
}));

import { config } from '../config';
import { postCanonicalUrl, republishContent } from '@openpeepshq/common/lib';
import { serverRootUrl } from './index';

/**
 * Provenance guard for the public-group repost (issue #654): the republished
 * note's link is built from `serverRootUrl()`, which derives its origin from
 * `config().server.host` — the same source the notification/email pipeline
 * uses. This pins that the republished content URL (1) tracks `server.host`
 * and (2) stays in lockstep with the notification `postCanonicalUrl` format,
 * so a host-config or link-format change cannot silently diverge the two.
 */
describe('republished repost link provenance', () => {
  const postId = '019f3e5e-b11f-7e8a-b3ca-a9cc0c77a5e7';

  beforeEach(() => {
    vi.mocked(config).mockReset();
  });

  it('derives the link origin from config().server.host', async () => {
    vi.mocked(config).mockResolvedValue({
      server: { host: 'community.example.com' },
    } as never);

    const content = await republishContent(
      await serverRootUrl(),
      postId,
      'openpeeps',
    );

    // Loopback/public protocol inference is applied on top of server.host.
    expect(content).toBe(
      `From openpeeps:\nhttps://community.example.com/posts/${postId}`,
    );
  });

  it('matches the notification link format for the same server.host', async () => {
    vi.mocked(config).mockResolvedValue({
      server: { host: 'localhost:5174' },
    } as never);

    const rootUrl = await serverRootUrl();
    const content = await republishContent(rootUrl, postId, 'openpeeps');

    const notificationLink = postCanonicalUrl(rootUrl, postId);
    expect(content).toBe(`From openpeeps:\n${notificationLink}`);
    expect(content.endsWith(notificationLink)).toBe(true);
    expect(notificationLink).toBe(`http://localhost:5174/posts/${postId}`);
  });
});
