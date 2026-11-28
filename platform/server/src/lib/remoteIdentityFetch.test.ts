/**
 * Seam tests for the fedify-backed remote-identity fetcher: every failure
 * path must resolve `undefined` (never throw), and the success path must map
 * the actor document onto the same `RemoteActorInput` shape the inbound
 * Create listener uses. `@openpeepshq/core/federation` is mocked wholesale so
 * the real (config/DB-backed) `hostnameOf` never loads, matching the
 * mock-the-gate style of `federateFollow.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  getActiveFederation: vi.fn(),
  // The real `hostnameOf` (config/DB-backed barrel) is out; this default
  // mirrors its URL behaviour for the test doubles.
  hostnameOfImpl: (value: string | URL) => {
    try {
      return new URL(String(value)).hostname.toLowerCase() || null;
    } catch {
      return null;
    }
  },
  hostnameOf: vi.fn(),
}));

vi.mock('@openpeepshq/core/federation', () => ({
  hostnameOf: h.hostnameOf,
}));

vi.mock('@openpeepshq/core/search', () => ({}));

vi.mock('../federation/fedify', () => ({
  getActiveFederation: h.getActiveFederation,
  // The fetcher imports the shared `asText` from this module. The mock is a
  // gate-mock (only the federation instance is stubbed), so expose the real
  // helper to keep the `name`/`summary` mapping under test.
  asText: (value: unknown): string | undefined => {
    if (value == null) return undefined;
    const text = String(value);
    return text.length > 0 ? text : undefined;
  },
}));

vi.mock('@fedify/fedify/vocab', () => ({
  Object: { fromJsonLd: vi.fn() },
}));

import { Object as ApObject } from '@fedify/fedify/vocab';
import { fedifyRemoteIdentityFetcher } from './remoteIdentityFetch';

const ACTOR = {
  id: new URL('https://mastodon.social/users/alice'),
  inboxId: new URL('https://mastodon.social/inbox/alice'),
  endpoints: { sharedInbox: new URL('https://mastodon.social/inbox') },
  // Fedify's parsed actor exposes the image as an `imageId` URL getter, not
  // an `image` object — the mock mirrors that real runtime shape.
  imageId: new URL('https://files.mastodon.social/alice.png'),
  name: 'Alice',
  summary: 'Remote bio',
};

const identity = { handle: 'alice', domain: 'mastodon.social' };

const SELF_LINK = {
  rel: 'self',
  type: 'application/activity+json',
  href: 'https://mastodon.social/users/alice',
};

type CtxOverrides = {
  lookupWebFinger?: unknown;
  documentLoader?: unknown;
};

/** Builds a fake federation whose context honours the given overrides. */
const activeFederation = (ctx: CtxOverrides) => ({
  federation: {
    createContext: vi.fn(() => ({
      lookupWebFinger:
        ctx.lookupWebFinger ??
        vi.fn(async () => ({
          subject: 'https://mastodon.social/@alice',
          links: [SELF_LINK],
        })),
      documentLoader:
        ctx.documentLoader ??
        vi.fn(async () => ({ document: { '@type': 'Person' } })),
      contextLoader: vi.fn(),
    })),
  },
  origin: 'https://origin.example',
});

const fromJsonLd = () => ApObject.fromJsonLd as ReturnType<typeof vi.fn>;

beforeEach(() => {
  fromJsonLd().mockReset().mockResolvedValue(ACTOR);
  h.getActiveFederation.mockReset();
  h.hostnameOf.mockReset().mockImplementation(h.hostnameOfImpl);
});

const expectUndefined = async (
  federation: ReturnType<typeof activeFederation>,
) => {
  h.getActiveFederation.mockReturnValue(federation);
  await expect(fedifyRemoteIdentityFetcher(identity)).resolves.toBeUndefined();
};

describe('fedifyRemoteIdentityFetcher failure paths', () => {
  it('returns undefined when federation is inactive', async () => {
    h.getActiveFederation.mockReturnValue(null);
    await expect(
      fedifyRemoteIdentityFetcher(identity),
    ).resolves.toBeUndefined();
  });

  it('returns undefined when WebFinger throws', async () => {
    await expectUndefined(
      activeFederation({
        lookupWebFinger: vi.fn(async () => {
          throw new Error('network down');
        }),
      }),
    );
  });

  it('returns undefined when WebFinger misses', async () => {
    await expectUndefined(
      activeFederation({ lookupWebFinger: vi.fn(async () => undefined) }),
    );
  });

  it('returns undefined when the descriptor has no self link and no subject', async () => {
    h.getActiveFederation.mockReturnValue(
      activeFederation({
        lookupWebFinger: vi.fn(async () => ({ links: [] })),
      }),
    );
    await expect(
      fedifyRemoteIdentityFetcher(identity),
    ).resolves.toBeUndefined();
  });

  it('returns undefined when the document loader throws', async () => {
    await expectUndefined(
      activeFederation({
        documentLoader: vi.fn(async () => {
          throw new Error('404');
        }),
      }),
    );
  });

  it('returns undefined when the document cannot be parsed as an actor', async () => {
    h.getActiveFederation.mockReturnValue(activeFederation({}));
    fromJsonLd().mockRejectedValueOnce(new Error('not json-ld'));
    await expect(
      fedifyRemoteIdentityFetcher(identity),
    ).resolves.toBeUndefined();
  });

  it('returns undefined when the parsed actor has no id', async () => {
    h.getActiveFederation.mockReturnValue(activeFederation({}));
    fromJsonLd().mockResolvedValueOnce({ ...ACTOR, id: undefined });
    await expect(
      fedifyRemoteIdentityFetcher(identity),
    ).resolves.toBeUndefined();
  });
});

describe('fedifyRemoteIdentityFetcher self-link selection', () => {
  const withLinks = (links: unknown[]) =>
    activeFederation({
      lookupWebFinger: vi.fn(async () => ({
        subject: 'https://mastodon.social/@alice',
        links,
      })),
    });

  it('prefers the activity+json self link over the subject', async () => {
    const federation = withLinks([
      {
        rel: 'self',
        type: 'text/html',
        href: 'https://mastodon.social/@alice',
      },
      SELF_LINK,
    ]);
    h.getActiveFederation.mockReturnValue(federation);
    fromJsonLd().mockReset().mockResolvedValue(ACTOR);

    await fedifyRemoteIdentityFetcher(identity);

    const ctx = (
      federation.federation.createContext as ReturnType<typeof vi.fn>
    ).mock.results[0].value;
    expect(ctx.documentLoader).toHaveBeenCalledWith(
      'https://mastodon.social/users/alice',
    );
  });

  it('falls back to the ld+json self link when no activity link exists', async () => {
    const federation = withLinks([
      {
        rel: 'self',
        type: 'application/ld+json',
        href: 'https://mastodon.social/users/alice.json',
      },
    ]);
    h.getActiveFederation.mockReturnValue(federation);
    fromJsonLd().mockReset().mockResolvedValue(ACTOR);

    await fedifyRemoteIdentityFetcher(identity);

    const ctx = (
      federation.federation.createContext as ReturnType<typeof vi.fn>
    ).mock.results[0].value;
    expect(ctx.documentLoader).toHaveBeenCalledWith(
      'https://mastodon.social/users/alice.json',
    );
  });

  it('falls back to the WebFinger subject when no self link matches', async () => {
    const federation = withLinks([{ rel: 'self', type: 'text/html' }]);
    h.getActiveFederation.mockReturnValue(federation);
    fromJsonLd().mockReset().mockResolvedValue(ACTOR);

    await fedifyRemoteIdentityFetcher(identity);

    const ctx = (
      federation.federation.createContext as ReturnType<typeof vi.fn>
    ).mock.results[0].value;
    expect(ctx.documentLoader).toHaveBeenCalledWith(
      'https://mastodon.social/@alice',
    );
  });
});

describe('fedifyRemoteIdentityFetcher success mapping', () => {
  it('maps the actor document onto the RemoteActorInput shape', async () => {
    const federation = activeFederation({});
    h.getActiveFederation.mockReturnValue(federation);
    fromJsonLd().mockReset().mockResolvedValue(ACTOR);

    const result = await fedifyRemoteIdentityFetcher(identity);

    expect(result).toEqual({
      uri: 'https://mastodon.social/users/alice',
      handle: 'alice',
      domain: 'mastodon.social',
      inboxUrl: 'https://mastodon.social/inbox/alice',
      sharedInboxUrl: 'https://mastodon.social/inbox',
      avatar: 'https://files.mastodon.social/alice.png',
      displayName: 'Alice',
      bio: 'Remote bio',
    });
    // The query is looked up via WebFinger as acct:handle@domain.
    const ctx = (
      federation.federation.createContext as ReturnType<typeof vi.fn>
    ).mock.results[0].value;
    expect(ctx.lookupWebFinger).toHaveBeenCalledWith(
      'acct:alice@mastodon.social',
    );
    expect(h.hostnameOf).toHaveBeenCalledWith(ACTOR.id);
  });

  it('falls back to the queried domain when the actor id has no hostname', async () => {
    const federation = activeFederation({});
    h.getActiveFederation.mockReturnValue(federation);
    fromJsonLd()
      .mockReset()
      .mockResolvedValue({
        ...ACTOR,
        id: new URL('https://mastodon.social/users/alice#me'),
      });
    h.hostnameOf.mockImplementationOnce(() => null);

    const result = await fedifyRemoteIdentityFetcher(identity);

    expect(result?.domain).toBe('mastodon.social');
  });
});
