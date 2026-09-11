import { describe, expect, it } from 'vitest';
import {
  buildSignatureFromHtml,
  forceReloadOnce,
  reloadIfBuildIsStale,
  startStaleAppReload,
  type StaleAppReloadIo,
} from '../staleAppReload';

const htmlWithAssets = (scripts: string[], css: string[] = []): string =>
  [
    '<!doctype html><html><head>',
    ...css.map((href) => `<link rel="stylesheet" href="${href}">`),
    '</head><body>',
    ...scripts.map(
      (src) => `<script type="module" crossorigin src="${src}"></script>`,
    ),
    '</body></html>',
  ].join('');

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    data,
  };
};

const io = (
  overrides: Partial<StaleAppReloadIo> & {
    storage?: ReturnType<typeof memoryStorage>;
  } = {},
): StaleAppReloadIo & { reloads: number } => {
  const storage = overrides.storage ?? memoryStorage();
  const result = {
    reloads: 0,
    fetchHtml:
      overrides.fetchHtml ??
      (async () => htmlWithAssets(['/assets/index-old.js'])),
    currentSignature:
      overrides.currentSignature ??
      (() => buildSignatureFromHtml(htmlWithAssets(['/assets/index-old.js']))),
    storage,
    reload: () => {
      result.reloads += 1;
      overrides.reload?.();
    },
    now: overrides.now ?? (() => 1_000_000),
  };
  return result;
};

describe('buildSignatureFromHtml', () => {
  it('returns a stable set of hashed asset paths', () => {
    expect(
      buildSignatureFromHtml(
        htmlWithAssets(
          ['/assets/index-aaa.js', '/assets/vendor-bbb.js'],
          ['/assets/index-ccc.css'],
        ),
      ),
    ).toBe('/assets/index-aaa.js|/assets/index-ccc.css|/assets/vendor-bbb.js');
  });

  it('returns null when the document is not a production build', () => {
    expect(
      buildSignatureFromHtml(
        '<script type="module" src="/src/main.tsx"></script>',
      ),
    ).toBeNull();
  });
});

describe('reloadIfBuildIsStale', () => {
  it('reloads when the deployed assets differ from the running shell', async () => {
    const check = io({
      fetchHtml: async () => htmlWithAssets(['/assets/index-new.js']),
    });
    await expect(reloadIfBuildIsStale(check)).resolves.toBe(true);
    expect(check.reloads).toBe(1);
  });

  it('does not reload when the build is current', async () => {
    const check = io();
    await expect(reloadIfBuildIsStale(check)).resolves.toBe(false);
    expect(check.reloads).toBe(0);
  });

  it('does not reload in Vite dev (no hashed assets)', async () => {
    const check = io({
      currentSignature: () => null,
      fetchHtml: async () => htmlWithAssets(['/assets/index-new.js']),
    });
    await expect(reloadIfBuildIsStale(check)).resolves.toBe(false);
    expect(check.reloads).toBe(0);
  });

  it('does not loop if a reload already targeted the same new build', async () => {
    const check = io({
      fetchHtml: async () => htmlWithAssets(['/assets/index-new.js']),
      storage: memoryStorage({
        'openpeeps:stale-build': '/assets/index-new.js',
      }),
    });
    await expect(reloadIfBuildIsStale(check)).resolves.toBe(false);
    expect(check.reloads).toBe(0);
  });

  it('ignores fetch failures', async () => {
    const check = io({
      fetchHtml: async () => {
        throw new Error('offline');
      },
    });
    await expect(reloadIfBuildIsStale(check)).resolves.toBe(false);
    expect(check.reloads).toBe(0);
  });
});

describe('forceReloadOnce', () => {
  it('suppresses another reload inside the cooldown window', () => {
    const storage = memoryStorage();
    let reloads = 0;
    const reloadIo = {
      storage,
      reload: () => {
        reloads += 1;
      },
      now: () => 5_000,
    };
    expect(forceReloadOnce(reloadIo)).toBe(true);
    expect(forceReloadOnce(reloadIo)).toBe(false);
    expect(reloads).toBe(1);
  });
});

describe('startStaleAppReload', () => {
  it('checks immediately and on visibility, and stops after cleanup', async () => {
    let fetchCount = 0;
    const listeners = new Map<string, () => void>();
    const check = io({
      fetchHtml: async () => {
        fetchCount += 1;
        return htmlWithAssets(['/assets/index-old.js']);
      },
    });
    const target = {
      visibilityState: 'visible' as Document['visibilityState'],
      addEventListener: (type: string, listener: () => void) => {
        listeners.set(type, listener);
      },
      removeEventListener: (type: string) => {
        listeners.delete(type);
      },
    };

    const stop = startStaleAppReload(check, {
      intervalMs: 60_000,
      target,
      preloadTarget: {
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
    await Promise.resolve();
    expect(fetchCount).toBe(1);

    listeners.get('visibilitychange')?.();
    await Promise.resolve();
    expect(fetchCount).toBe(2);

    stop();
    listeners.get('visibilitychange')?.();
    await Promise.resolve();
    expect(fetchCount).toBe(2);
  });
});
