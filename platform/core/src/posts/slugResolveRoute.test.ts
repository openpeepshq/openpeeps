import { beforeEach, describe, expect, it, vi } from 'vitest';

// Unit test for the slug-support example plugin's `GET /resolve` handler —
// the endpoint other plugin authors use to map slug URLs back to posts. It
// lives here (instead of in `examples/slug-support`) because CI's unit-test
// job runs the platform packages, not the example plugins, and the handler's
// contract is a direct consumer of core's `findPostBySlug`. The express
// router is replaced with a recording stub so no new dependency is needed;
// every `@openpeepshq/*` import the handler pulls in is mocked.

const { config, findPostBySlug, logger, mockZ } = vi.hoisted(() => {
  // Minimal stand-in for the zod surface the plugin uses: per-field chains
  // apply their `transform` on parse (the handlers compare
  // `parsed.instanceScoped === true`), and `z.object` parses each field.
  // The contract pinned here is the route's response shapes, not validation.
  const makeChain = (
    parse: (value: unknown) => unknown,
  ): { parse: (value: unknown) => unknown } & Record<string, unknown> => {
    const chain = { parse } as {
      parse: (value: unknown) => unknown;
    } & Record<string, unknown>;
    for (const method of ['optional', 'default', 'min', 'max', 'int']) {
      chain[method] = () => chain;
    }
    chain.transform = (fn: (value: unknown) => unknown) =>
      makeChain((value) => (value === undefined ? undefined : fn(value)));
    return chain;
  };
  const zObject = (shape: Record<string, unknown>) =>
    makeChain((value) => {
      const input = (value ?? {}) as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        const field = shape[key] as { parse?: (v: unknown) => unknown };
        out[key] =
          typeof field?.parse === 'function'
            ? field.parse(input[key])
            : input[key];
      }
      return out;
    });
  // Scalar leaves parse to themselves (undefined stays undefined, so
  // `optional()` fields stay absent).
  const identityLeaf = makeChain((value) => value);
  const mockZ = {
    object: zObject,
    boolean: () => identityLeaf,
    number: () => identityLeaf,
    array: () => identityLeaf,
    string: () => identityLeaf,
    enum: () => identityLeaf,
  };
  return {
    config: vi.fn(),
    findPostBySlug: vi.fn(),
    logger: vi.fn(),
    mockZ,
  };
});

vi.mock('@openpeepshq/common/zod', () => ({ z: mockZ }));
vi.mock('@openpeepshq/core/config', () => ({ config }));
vi.mock('@openpeepshq/core/log', () => ({ logger }));
vi.mock('@openpeepshq/core/plugins', () => ({ ensurePluginAuth: vi.fn() }));
vi.mock('@openpeepshq/core/posts', () => ({ findPostBySlug }));
vi.mock('@openpeepshq/core/db', () => ({
  allpeepDb: vi.fn(async () => {
    throw new Error('db is not reachable in unit tests');
  }),
}));
vi.mock('@openpeepshq/core/profiles', () => ({
  findProfile: vi.fn(async () => null),
}));

import { routes } from '../../../../examples/slug-support/src/routes';

type Handler = (req: unknown, res: unknown) => void | Promise<unknown>;

const configDefaults = {
  enabled: true,
  maxSlugLength: 100,
  autoGenerate: true,
  allowInstanceScoped: true,
  instanceScopedRoles: ['admin', 'moderator'],
};

const recordingRouter = () => {
  const handlers = new Map<string, Handler[]>();
  return {
    handlers,
    router: {
      get: (path: string, ...middlewares: Handler[]) => {
        handlers.set(path, middlewares);
      },
      post: (path: string, ...middlewares: Handler[]) => {
        handlers.set(path, middlewares);
      },
    },
  };
};

const callResolve = async (
  handlers: Map<string, Handler[]>,
  query: Record<string, string>,
) => {
  const middleware = handlers.get('/resolve');
  if (!middleware || middleware.length < 2)
    throw new Error('/resolve route not registered');
  const captured: { status?: number; body?: unknown } = {};
  const res = {
    status: (code: number) => {
      captured.status = code;
      return res;
    },
    json: (body: unknown) => {
      captured.body = body;
      return res;
    },
  };
  await middleware[1]({ query, pluginProfile: { id: 'profile-1' } }, res);
  return captured;
};

beforeEach(() => {
  vi.clearAllMocks();
  config.mockResolvedValue(configDefaults);
  findPostBySlug.mockResolvedValue(null);
  logger.mockReturnValue({ error: vi.fn() });
});

describe('GET /resolve (slug-support plugin)', () => {
  const handler = async () => {
    const { handlers, router } = recordingRouter();
    await routes(router as unknown as Parameters<typeof routes>[0]);
    return handlers;
  };

  it('resolves an instance-scoped slug through findPostBySlug', async () => {
    findPostBySlug.mockResolvedValue({ id: 'post-1' });
    const res = await callResolve(await handler(), {
      slug: 'my-article',
      instanceScoped: 'true',
    });
    expect(res.status).toBeUndefined();
    expect(res.body).toEqual({ success: true, data: { postId: 'post-1' } });
    expect(findPostBySlug).toHaveBeenCalledWith('my-article', undefined, true);
  });

  it('resolves a profile-scoped slug, stripping the @ from the handle', async () => {
    findPostBySlug.mockResolvedValue({ id: 'post-2' });
    const res = await callResolve(await handler(), {
      slug: 'my-article',
      profile: '@alice',
    });
    expect(res.body).toEqual({ success: true, data: { postId: 'post-2' } });
    expect(findPostBySlug).toHaveBeenCalledWith('my-article', 'alice', false);
  });

  it('returns the null envelope (200) for an unresolved slug', async () => {
    findPostBySlug.mockResolvedValue(null);
    const res = await callResolve(await handler(), {
      slug: 'missing-article',
      instanceScoped: 'true',
    });
    expect(res.body).toEqual({ success: true, data: null });
    expect(findPostBySlug).toHaveBeenCalledWith(
      'missing-article',
      undefined,
      true,
    );
  });

  it('refuses a scope conflict (both markers) without querying', async () => {
    const res = await callResolve(await handler(), {
      slug: 'my-article',
      instanceScoped: 'true',
      profile: '@alice',
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'scope conflict' });
    expect(findPostBySlug).not.toHaveBeenCalled();
  });

  it('refuses a missing scope marker without querying', async () => {
    const res = await callResolve(await handler(), { slug: 'my-article' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'scope required' });
    expect(findPostBySlug).not.toHaveBeenCalled();
  });

  it('returns the null envelope when the plugin is disabled', async () => {
    config.mockResolvedValue({ ...configDefaults, enabled: false });
    const res = await callResolve(await handler(), {
      slug: 'my-article',
      instanceScoped: 'true',
    });
    expect(res.body).toEqual({ success: true, data: null });
    expect(findPostBySlug).not.toHaveBeenCalled();
  });
});
