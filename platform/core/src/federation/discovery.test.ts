import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileWithMeta } from '@openpeepshq/common/types';

// `../config` is the only dependency stubbed wholesale: the **real** `./peers`
// module must run, because a previous revision mocked it with its own
// fixed `hostnameOf` and the scheme-less gate call (#241 review #1) slipped
// through CI (#241 review #2). `peerHostAllowed` is wrapped in a spy so the
// real allow/block decision runs while the gate's call shape stays
// assertable; `./actors` stays stubbed so no profile row is written.
const testConfig = vi.hoisted(() => ({
  allowedHosts: [] as string[],
  blockedHosts: [] as string[],
}));

vi.mock('../config', () => ({
  config: vi.fn(),
}));
vi.mock('./peers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./peers')>();
  return {
    ...actual,
    // Spied, not replaced: `vi.clearAllMocks()` in beforeEach clears the
    // call history but keeps the real implementation, so every case still
    // runs the real allow/block decision.
    peerHostAllowed: vi.fn(actual.peerHostAllowed),
  };
});
vi.mock('./actors', () => ({
  upsertRemoteActor: vi.fn(),
  federatedHandleFrom: vi.fn(
    (preferred: string | null | undefined) =>
      (preferred ?? '').replace(/[^a-zA-Z0-9_.-]/g, '') || 'actor',
  ),
}));

const {
  actorDocToRemoteInput,
  asHttpUrl,
  asText,
  parseRemoteAccountQuery,
  resolveRemoteAccount,
} = await import('./discovery');
const { config } = await import('../config');
const { peerHostAllowed } = await import('./peers');
const { upsertRemoteActor } = await import('./actors');

const remoteProfile = {
  id: 'remote-profile-1',
  handle: 'user',
  type: 'federated',
} as ProfileWithMeta;

const actorDoc = {
  id: 'https://remote.example/users/user',
  preferredUsername: 'user',
  name: 'User',
  summary: 'a bio',
  inbox: 'https://remote.example/inbox',
  endpoints: { sharedInbox: 'https://remote.example/shared' },
  publicKey: { publicKeyPem: 'PEM' },
  icon: { url: 'https://remote.example/avatar.png' },
};

const json = (body: unknown) =>
  ({ ok: true, json: async () => body }) as unknown as Response;

const notOk = (status: number) =>
  ({
    ok: false,
    status,
    json: async () => {
      throw new Error('not ok');
    },
  }) as unknown as Response;

describe('discovery pure helpers', () => {
  it('parseRemoteAccountQuery handles @user@domain, user@domain, and actor URLs', () => {
    expect(parseRemoteAccountQuery('@user@remote.example')).toEqual({
      kind: 'handle',
      user: 'user',
      domain: 'remote.example',
    });
    expect(parseRemoteAccountQuery('user@remote.example')).toEqual({
      kind: 'handle',
      user: 'user',
      domain: 'remote.example',
    });
    expect(
      parseRemoteAccountQuery('https://remote.example/users/user'),
    ).toEqual({ kind: 'url', url: 'https://remote.example/users/user' });
  });

  it('parseRemoteAccountQuery rejects malformed input', () => {
    expect(parseRemoteAccountQuery('not-a-handle')).toBeNull();
    expect(parseRemoteAccountQuery('user@')).toBeNull();
    expect(parseRemoteAccountQuery('@domain')).toBeNull();
    expect(parseRemoteAccountQuery('  ')).toBeNull();
  });

  it('asText unwraps LanguageMaps and drops empties', () => {
    expect(asText({ en: 'hi' })).toBe('hi');
    expect(asText('plain')).toBe('plain');
    expect(asText('')).toBeUndefined();
    expect(asText(null)).toBeUndefined();
  });

  it('asHttpUrl only accepts http(s)', () => {
    expect(asHttpUrl('https://x.example/')).toBeInstanceOf(URL);
    expect(asHttpUrl('ftp://x.example/')).toBeUndefined();
    expect(asHttpUrl('not a url')).toBeUndefined();
  });

  it('actorDocToRemoteInput maps a document to RemoteActorInput', () => {
    expect(actorDocToRemoteInput(actorDoc)).toEqual({
      uri: 'https://remote.example/users/user',
      handle: 'user',
      domain: 'remote.example',
      inboxUrl: 'https://remote.example/inbox',
      sharedInboxUrl: 'https://remote.example/shared',
      publicKeyPem: 'PEM',
      displayName: 'User',
      bio: 'a bio',
      avatar: 'https://remote.example/avatar.png',
    });
  });

  it('actorDocToRemoteInput returns undefined without an id', () => {
    expect(actorDocToRemoteInput({ name: 'No Id' })).toBeUndefined();
  });
});

describe('resolveRemoteAccount', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    // The real `peerHostAllowed` reads the config through the mocked
    // `../config`, so both subtrees it needs must be present.
    testConfig.allowedHosts = ['remote.example'];
    testConfig.blockedHosts = [];
    vi.mocked(config).mockResolvedValue({
      activityPub: { federation: { requestTimeout: 5000 } },
      federation: {
        allowedHosts: testConfig.allowedHosts,
        blockedHosts: testConfig.blockedHosts,
      },
    } as never);
    vi.mocked(upsertRemoteActor).mockResolvedValue(remoteProfile);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves @user@domain via WebFinger self link then the actor document', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/.well-known/webfinger')) {
        return json({
          links: [
            {
              rel: 'self',
              type: 'application/activity+json',
              href: 'https://remote.example/users/user',
            },
          ],
        });
      }
      return json(actorDoc);
    });

    const resolved = await resolveRemoteAccount('@user@remote.example');

    expect(resolved).toBe(remoteProfile);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      'acct:user@remote.example',
    );
    // The gate must run against the real `./peers` module (review #2), and
    // with a URL value at both call sites — the handle's domain and the
    // discovered actor (review #1). A regression to the old scheme-less
    // string call fails here: the real `hostnameOf` (`new URL`) rejects it,
    // so the allowlist would deny every remote.
    expect(peerHostAllowed).toHaveBeenCalledTimes(2);
    for (const index of [0, 1]) {
      const arg = peerHostAllowed.mock.calls[index][0] as URL;
      expect(arg).toBeInstanceOf(URL);
      expect(arg.hostname).toBe('remote.example');
    }
    expect(upsertRemoteActor).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'https://remote.example/users/user',
        inboxUrl: 'https://remote.example/inbox',
        sharedInboxUrl: 'https://remote.example/shared',
        publicKeyPem: 'PEM',
      }),
    );
  });

  it('resolves an https actor URL directly without WebFinger', async () => {
    fetchMock.mockResolvedValue(json(actorDoc));

    const resolved = await resolveRemoteAccount(
      'https://remote.example/users/user',
    );

    expect(resolved).toBe(remoteProfile);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://remote.example/users/user',
    );
    // The URL path must also pass the real gate (review #2) — with a URL
    // value, so a regression to `hostnameOf(URL)` vs a bare host stays loud.
    expect(peerHostAllowed).toHaveBeenCalledTimes(1);
    expect(peerHostAllowed).toHaveBeenLastCalledWith(expect.any(URL));
  });

  it('returns undefined for a disallowed host without fetching', async () => {
    // Real denial path: the host is simply off the allowlist, no mock
    // override — this is what made the old bug (review #1) invisible,
    // where the gate was bypassed by the mocked module.
    testConfig.allowedHosts = ['other.example'];

    const resolved = await resolveRemoteAccount('@user@denied.example');

    expect(resolved).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(upsertRemoteActor).not.toHaveBeenCalled();
    // The gate saw the host as a URL and, through the real `./peers`
    // module, denied the off-allowlist host (review #1 regression pin).
    expect(peerHostAllowed).toHaveBeenCalledTimes(1);
    const gateArg = peerHostAllowed.mock.calls[0][0] as URL;
    expect(gateArg).toBeInstanceOf(URL);
    expect(gateArg.hostname).toBe('denied.example');
  });

  it('returns undefined when WebFinger has no activity self link', async () => {
    fetchMock.mockResolvedValue(json({ links: [{ rel: 'self', href: 'x' }] }));

    const resolved = await resolveRemoteAccount('@user@remote.example');

    expect(resolved).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(upsertRemoteActor).not.toHaveBeenCalled();
  });

  it('propagates network/timeout failures so the caller maps them to 5xx', async () => {
    fetchMock.mockRejectedValue(
      Object.assign(new Error('timeout'), {
        name: 'TimeoutError',
      }),
    );

    await expect(resolveRemoteAccount('@user@remote.example')).rejects.toThrow(
      'timeout',
    );
  });

  it('returns undefined when WebFinger responds non-2xx (e.g. 404 for unknown acct)', async () => {
    fetchMock.mockResolvedValueOnce(notOk(404));

    const resolved = await resolveRemoteAccount('@ghost@remote.example');

    expect(resolved).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(upsertRemoteActor).not.toHaveBeenCalled();
  });

  it('returns undefined on a malformed (non-JSON) WebFinger body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    } as unknown as Response);

    await expect(resolveRemoteAccount('@user@remote.example')).rejects.toThrow(
      'Unexpected token',
    );
    expect(upsertRemoteActor).not.toHaveBeenCalled();
  });

  it('returns undefined when the actor document responds non-2xx', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        links: [
          {
            rel: 'self',
            type: 'application/activity+json',
            href: 'https://remote.example/users/user',
          },
        ],
      }),
    );
    fetchMock.mockResolvedValueOnce(notOk(502));

    const resolved = await resolveRemoteAccount('@user@remote.example');

    expect(resolved).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(upsertRemoteActor).not.toHaveBeenCalled();
  });

  it('returns undefined on a non-JSON actor document', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        links: [
          {
            rel: 'self',
            type: 'application/activity+json',
            href: 'https://remote.example/users/user',
          },
        ],
      }),
    );
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    } as unknown as Response);

    await expect(resolveRemoteAccount('@user@remote.example')).rejects.toThrow(
      'Unexpected token',
    );
    expect(upsertRemoteActor).not.toHaveBeenCalled();
  });

  it('does not follow redirects (allowlist cannot be bypassed mid-flight)', async () => {
    fetchMock.mockImplementation(async (_input, init) => {
      expect(init).toMatchObject({ redirect: 'error' });
      throw new TypeError(
        'request: redirect to "https://internal/" not allowed',
      );
    });

    await expect(
      resolveRemoteAccount('https://remote.example/users/user'),
    ).rejects.toThrow('not allowed');
    expect(upsertRemoteActor).not.toHaveBeenCalled();
  });

  it('returns undefined for an inbox-less actor (unfederatable)', async () => {
    const noInboxDoc = { ...actorDoc, inbox: undefined };
    fetchMock.mockResolvedValue(json(noInboxDoc));

    const resolved = await resolveRemoteAccount(
      'https://remote.example/users/user',
    );

    expect(resolved).toBeUndefined();
    expect(upsertRemoteActor).not.toHaveBeenCalled();
  });

  it('rejects an actor that exposes only a sharedInbox (no direct inbox)', async () => {
    const sharedOnlyDoc = {
      ...actorDoc,
      inbox: undefined,
      endpoints: { sharedInbox: 'https://remote.example/shared' },
    };
    fetchMock.mockResolvedValue(json(sharedOnlyDoc));

    const resolved = await resolveRemoteAccount(
      'https://remote.example/users/user',
    );

    expect(resolved).toBeUndefined();
    expect(upsertRemoteActor).not.toHaveBeenCalled();
  });
});
