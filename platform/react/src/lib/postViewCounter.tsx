import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

const VIEW_DELAY_MS = 1_000;
const FLUSH_INTERVAL_MS = 30_000;
const VISIBILITY_THRESHOLD = 0;

interface PostViewCounterContextValue {
  queuePostView: (postId: string) => void;
  flush: () => Promise<void>;
}

const PostViewCounterContext = createContext<
  PostViewCounterContextValue | undefined
>(undefined);

export function PostViewCounterProvider({
  markPostsSeen,
  hasAuthToken,
  children,
}: {
  markPostsSeen: (postIds: string[]) => Promise<void>;
  hasAuthToken: boolean;
  children: ReactNode;
}) {
  const pendingPostIds = useRef(new Set<string>());
  const flushing = useRef(false);
  const markPostsSeenRef = useRef(markPostsSeen);
  markPostsSeenRef.current = markPostsSeen;

  const flush = useCallback(async () => {
    if (
      typeof window === 'undefined' ||
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
    } finally {
      flushing.current = false;
    }
  }, [hasAuthToken]);

  const queuePostView = useCallback(
    (postId: string) => {
      if (!postId || !hasAuthToken) return;
      pendingPostIds.current.add(postId);
    },
    [hasAuthToken],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !hasAuthToken) return;

    const interval = window.setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);

    const flushOnPageHide = () => void flush();
    const flushOnVisibilityHidden = () => {
      if (document.visibilityState === 'hidden') void flush();
    };

    window.addEventListener('pagehide', flushOnPageHide);
    document.addEventListener('visibilitychange', flushOnVisibilityHidden);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', flushOnPageHide);
      document.removeEventListener('visibilitychange', flushOnVisibilityHidden);
      void flush();
    };
  }, [flush, hasAuthToken]);

  return (
    <PostViewCounterContext.Provider value={{ queuePostView, flush }}>
      {children}
    </PostViewCounterContext.Provider>
  );
}

/** Attach the returned ref to a post container to batch-mark it seen after 1s in view. */
export function usePostViewRef(postId: string | undefined) {
  const context = useContext(PostViewCounterContext);
  const ref = useRef<HTMLDivElement | null>(null);

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
    let visible = false;

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
        context.queuePostView(postId);
        viewTimer = undefined;
      }, VIEW_DELAY_MS);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible =
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
}
