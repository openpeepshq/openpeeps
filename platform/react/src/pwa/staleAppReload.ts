import { logger } from '../log';

const log = logger('pwa');

const ASSET_PATH_RE = /\/assets\/[A-Za-z0-9_.-]+/g;
const STORAGE_SIGNATURE_KEY = 'openpeeps:stale-build';
const STORAGE_RELOAD_AT_KEY = 'openpeeps:forced-reload-at';
const DEFAULT_INTERVAL_MS = 60_000;
const RELOAD_COOLDOWN_MS = 10_000;

export type StaleAppReloadStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type StaleAppReloadIo = {
  fetchHtml: () => Promise<string>;
  currentSignature: () => string | null;
  storage: StaleAppReloadStorage;
  reload: () => void;
  now?: () => number;
};

/** Stable id of the JS/CSS files this HTML shell was built with. */
export const buildSignatureFromHtml = (html: string): string | null => {
  const matches = html.match(ASSET_PATH_RE);
  if (!matches?.length) return null;
  return [...new Set(matches)].sort().join('|');
};

export const buildSignatureFromDocument = (doc: Document): string | null => {
  const urls: string[] = [];
  doc
    .querySelectorAll(
      'script[src], link[rel="stylesheet"][href], link[rel="modulepreload"][href]',
    )
    .forEach((el) => {
      const url = el.getAttribute('src') ?? el.getAttribute('href');
      if (url) urls.push(url);
    });
  return buildSignatureFromHtml(urls.join(' '));
};

export const createBrowserStaleAppReloadIo = (): StaleAppReloadIo | null => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  return {
    fetchHtml: async () => {
      const res = await fetch('/', {
        cache: 'no-store',
        headers: { Accept: 'text/html' },
      });
      if (!res.ok) {
        throw new Error(`stale-check ${res.status}`);
      }
      return res.text();
    },
    currentSignature: () => buildSignatureFromDocument(document),
    storage: window.sessionStorage,
    reload: () => window.location.reload(),
  };
};

export const forceReloadOnce = (
  io: Pick<StaleAppReloadIo, 'storage' | 'reload'> & {
    now?: () => number;
  },
  cooldownMs = RELOAD_COOLDOWN_MS,
): boolean => {
  const now = io.now?.() ?? Date.now();
  const raw = io.storage.getItem(STORAGE_RELOAD_AT_KEY);
  if (raw) {
    const last = Number(raw);
    if (Number.isFinite(last) && now - last < cooldownMs) return false;
  }
  io.storage.setItem(STORAGE_RELOAD_AT_KEY, String(now));
  io.reload();
  return true;
};

/**
 * Compare the running shell's hashed assets to a freshly fetched `index.html`.
 * Reloads once when they differ so long-lived tabs pick up a new deploy.
 */
export const reloadIfBuildIsStale = async (
  io: StaleAppReloadIo,
): Promise<boolean> => {
  const current = io.currentSignature();
  if (!current) return false;

  let html: string;
  try {
    html = await io.fetchHtml();
  } catch (err) {
    log.debug('Stale-build check failed', err);
    return false;
  }

  const next = buildSignatureFromHtml(html);
  if (!next || next === current) return false;
  if (io.storage.getItem(STORAGE_SIGNATURE_KEY) === next) return false;

  log.info('App build is out of date; reloading');
  if (!forceReloadOnce(io)) return false;
  io.storage.setItem(STORAGE_SIGNATURE_KEY, next);
  return true;
};

type VisibilityTarget = Pick<
  Document,
  'addEventListener' | 'removeEventListener' | 'visibilityState'
>;

type PreloadTarget = Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
>;

export const startStaleAppReload = (
  io: StaleAppReloadIo | null = createBrowserStaleAppReloadIo(),
  options: {
    intervalMs?: number;
    target?: VisibilityTarget;
    preloadTarget?: PreloadTarget;
  } = {},
): (() => void) => {
  if (!io) return () => undefined;

  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const target =
    options.target ?? (typeof document === 'undefined' ? undefined : document);
  const preloadTarget =
    options.preloadTarget ??
    (typeof window === 'undefined' ? undefined : window);

  const check = () => {
    if (target?.visibilityState === 'hidden') return;
    void reloadIfBuildIsStale(io);
  };

  check();

  const onVisibility = () => {
    if (target?.visibilityState !== 'hidden') check();
  };
  target?.addEventListener('visibilitychange', onVisibility);

  const onPreloadError = () => {
    log.info('Asset preload failed; reloading');
    forceReloadOnce(io);
  };
  preloadTarget?.addEventListener('vite:preloadError', onPreloadError);

  const timer = setInterval(check, intervalMs);

  return () => {
    target?.removeEventListener('visibilitychange', onVisibility);
    preloadTarget?.removeEventListener('vite:preloadError', onPreloadError);
    clearInterval(timer);
  };
};
