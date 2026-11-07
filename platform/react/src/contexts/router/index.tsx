import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Navigator, NavTarget } from '../../navigation';

export interface RouterAdapter {
  pathname: string;
  searchParams: URLSearchParams;
  /**
   * Replace the query string, keeping the pathname and hash. `next` is the
   * full new params or a function of the current ones; pass
   * `{ replace: true }` to avoid adding a history entry.
   */
  setSearchParams: (
    next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
    opts?: { replace?: boolean },
  ) => void;
  /** Navigate to an abstract target (preferred) or a raw path string. */
  navigate: (target: NavTarget | string) => void;
  hrefOf: (target: NavTarget) => string;
  match: (pathname: string) => NavTarget | null;
  back: () => void;
}

const RouterContext = createContext<RouterAdapter | null>(null);

export const useRouter = (): RouterAdapter => {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside <RouterProvider>');
  return ctx;
};

export const useNavigate = () => useRouter().navigate;
export const useHrefOf = () => useRouter().hrefOf;
export const usePathname = () => useRouter().pathname;
export const useSearchParams = () => useRouter().searchParams;

/** Pathname when inside `RouterProvider`, otherwise `undefined` (no throw). */
export const useOptionalPathname = (): string | undefined => {
  const ctx = useContext(RouterContext);
  return ctx?.pathname;
};

export interface RouterProviderProps {
  adapter: RouterAdapter;
  children?: ReactNode;
}

/**
 * Bring-your-own-router context. Provide an adapter that maps to whichever
 * routing library the host application uses (react-router, Next.js, Tanstack
 * Router, etc).
 */
export function RouterProvider({ adapter, children }: RouterProviderProps) {
  return (
    <RouterContext.Provider value={adapter}>{children}</RouterContext.Provider>
  );
}

/**
 * Browser-only fallback — uses `window.location` + `popstate`. Suitable for
 * standalone PWAs that don't ship with a real router (e.g. dev shells).
 */
export function useBrowserRouter(navigator: Navigator): RouterAdapter {
  const initial = useMemo(() => {
    if (typeof window === 'undefined') {
      return { pathname: '/', searchParams: new URLSearchParams() };
    }
    return {
      pathname: window.location.pathname,
      searchParams: new URLSearchParams(window.location.search),
    };
  }, []);

  const [state, setState] = useState(initial);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () =>
      setState({
        pathname: window.location.pathname,
        searchParams: new URLSearchParams(window.location.search),
      });
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  const setSearchParams = useCallback<RouterAdapter['setSearchParams']>(
    (next, opts) => {
      if (typeof window === 'undefined') return;
      const prev = new URLSearchParams(window.location.search);
      const resolved = typeof next === 'function' ? next(prev) : next;
      const query = resolved.toString();
      const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
      // The URL bar is the source of truth here; skip no-op writes so the
      // state (and any subscribers) only change when the query actually does.
      if (
        url ===
        `${window.location.pathname}${window.location.search}${window.location.hash}`
      ) {
        return;
      }
      if (opts?.replace) {
        window.history.replaceState(window.history.state, '', url);
      } else {
        window.history.pushState(window.history.state, '', url);
      }
      setState({
        pathname: window.location.pathname,
        searchParams: new URLSearchParams(window.location.search),
      });
    },
    [],
  );

  return useMemo<RouterAdapter>(
    () => ({
      pathname: state.pathname,
      searchParams: state.searchParams,
      setSearchParams,
      hrefOf: navigator.hrefOf,
      match: navigator.match,
      navigate: (target) => {
        if (typeof window === 'undefined') return;
        const url =
          typeof target === 'string' ? target : navigator.hrefOf(target);
        history.pushState({}, '', url);
        setState({
          pathname: window.location.pathname,
          searchParams: new URLSearchParams(window.location.search),
        });
      },
      back: () => {
        if (typeof window === 'undefined') return;
        history.back();
      },
    }),
    [state, navigator, setSearchParams],
  );
}
