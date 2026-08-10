import { useEffect, useRef, type RefObject } from 'react';

export interface InfiniteScrollOptions {
  rootMargin?: string;
  threshold?: number;
  enabled?: boolean;
}

/**
 * React port of `buildInfiniteScroll` from @openpeepshq/ui — observes a sentinel
 * ref and fires `callback` when it intersects the viewport.
 */
export function useInfiniteScroll<T extends Element>(
  callback: () => void,
  { rootMargin = '100px', threshold = 0.1, enabled = true }: InfiniteScrollOptions = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          callbackRef.current();
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => {
      observer.unobserve(node);
      observer.disconnect();
    };
  }, [rootMargin, threshold, enabled]);

  return ref;
}
