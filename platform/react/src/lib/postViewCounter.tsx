import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useOptionalPathname } from '../contexts/router';

const VIEW_DELAY_MS = 1_000;
const FLUSH_DEBOUNCE_MS = 2_500;
const FLUSH_MAX_INTERVAL_MS = 10_000;
const FLUSH_THRESHOLD = 5;
const VISIBILITY_THRESHOLD = 0;

export type PostViewContext = {
  groupId?: string | null;
  conversationRootId?: string;
  adjustUnread?: boolean;
};

interface PostViewCounterContextValue {
  queuePostView: (postId: string, viewContext?: PostViewContext) => void;
  flush: () => Promise<void>;
}

const PostViewCounterContext = createContext<
  PostViewCounterContextValue | undefined
>(undefined);

const PostViewFlushOnNavigate = ({ flush }: { flush: () => Promise<void> }) => {
  const pathname = useOptionalPathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    void flush();
  }, [flush, pathname]);

  return null;
};

export const usePostViewFlush = (): (() => Promise<void>) => {
  const context = useContext(PostViewCounterContext);
  return context?.flush ?? (async () => undefined);
};

export const useQueuePostView = (): ((
  postId: string,
  viewContext?: PostViewContext,
) => void) => {
  const context = useContext(PostViewCounterContext);
  return context?.queuePostView ?? (() => undefined);
};

export const PostViewCounterProvider = ({
  markPostsSeen,
  hasAuthToken,
  onPostQueued,
  onFlushFailed,
  children,
}: {
  markPostsSeen: (postIds: string[]) => Promise<void>;
  hasAuthToken: boolean;
  onPostQueued?: (postId: string, viewContext?: PostViewContext) => void;
  onFlushFailed?: () => void;
  children: ReactNode;
}) => {
  const pendingPostIds = useRef(new Set<string>());
  const flushing = useRef(false);
  const flushDebounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const markPostsSeenRef = useRef(markPostsSeen);
  const onFlushFailedRef = useRef(onFlushFailed);
  markPostsSeenRef.current = markPostsSeen;
  onFlushFailedRef.current = onFlushFailed;

  const flush = useCallback(async () => {
    if (flushDebounceTimer.current) {
      clearTimeout(flushDebounceTimer.current);
      flushDebounceTimer.current = undefined;
    }

    if (
      flushing.current ||
      pendingPostIds.current.size === 0 ||
      !hasAuthToken
    ) {
      return;
    }

    const postIds = [...pendingPostIds.current];
    pendingPostIds.current.clear();
    flushing.current = true;

    try {
      await markPostsSeenRef.current(postIds);
    } catch {
      postIds.forEach((postId) => pendingPostIds.current.add(postId));
      onFlushFailedRef.current?.();
    } finally {
      flushing.current = false;
    }
  }, [hasAuthToken]);

  const scheduleFlush = useCallback(() => {
    if (!hasAuthToken) return;

    if (pendingPostIds.current.size >= FLUSH_THRESHOLD) {
      void flush();
      return;
    }

    if (flushDebounceTimer.current) {
      clearTimeout(flushDebounceTimer.current);
    }

    flushDebounceTimer.current = setTimeout(() => {
      flushDebounceTimer.current = undefined;
      void flush();
    }, FLUSH_DEBOUNCE_MS);
  }, [flush, hasAuthToken]);

  const queuePostView = useCallback(
    (postId: string, viewContext?: PostViewContext) => {
      if (!postId || !hasAuthToken) return;
      pendingPostIds.current.add(postId);
      if (viewContext?.adjustUnread) {
        onPostQueued?.(postId, viewContext);
      }
      scheduleFlush();
    },
    [hasAuthToken, onPostQueued, scheduleFlush],
  );

  useEffect(() => {
    if (!hasAuthToken) return;

    const interval = setInterval(() => {
      void flush();
    }, FLUSH_MAX_INTERVAL_MS);

    const hasWindow =
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      typeof window.addEventListener === 'function';

    const flushOnPageHide = () => void flush();
    const flushOnVisibilityHidden = () => {
      if (document.visibilityState === 'hidden') void flush();
    };

    if (hasWindow) {
      window.addEventListener('pagehide', flushOnPageHide);
      document.addEventListener('visibilitychange', flushOnVisibilityHidden);
    }

    return () => {
      clearInterval(interval);
      if (flushDebounceTimer.current) {
        clearTimeout(flushDebounceTimer.current);
      }
      if (hasWindow) {
        window.removeEventListener('pagehide', flushOnPageHide);
        document.removeEventListener(
          'visibilitychange',
          flushOnVisibilityHidden,
        );
      }
      void flush();
    };
  }, [flush, hasAuthToken]);

  return (
    <PostViewCounterContext.Provider value={{ queuePostView, flush }}>
      <PostViewFlushOnNavigate flush={flush} />
      {children}
    </PostViewCounterContext.Provider>
  );
};

/** Attach the returned ref to a post container to batch-mark it seen after 1s in view. */
export const usePostViewRef = <T extends HTMLElement = HTMLElement>(
  postId: string | undefined,
  viewContext?: PostViewContext,
) => {
  const context = useContext(PostViewCounterContext);
  const ref = useRef<T | null>(null);
  const viewContextRef = useRef(viewContext);
  viewContextRef.current = viewContext;

  useEffect(() => {
    const node = ref.current;
    if (
      !node ||
      !postId ||
      !context ||
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window)
    ) {
      return;
    }

    let viewTimer: ReturnType<typeof setTimeout> | undefined;
    let counted = false;

    const clearViewTimer = () => {
      if (viewTimer) {
        clearTimeout(viewTimer);
        viewTimer = undefined;
      }
    };

    const startViewTimer = () => {
      if (counted || viewTimer) return;
      viewTimer = setTimeout(() => {
        counted = true;
        context.queuePostView(postId, viewContextRef.current);
        viewTimer = undefined;
      }, VIEW_DELAY_MS);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible =
          !!entry?.isIntersecting &&
          entry.intersectionRatio > VISIBILITY_THRESHOLD;
        if (visible) startViewTimer();
        else clearViewTimer();
      },
      { threshold: VISIBILITY_THRESHOLD },
    );

    observer.observe(node);

    return () => {
      clearViewTimer();
      observer.disconnect();
    };
  }, [context, postId]);

  return ref;
};
