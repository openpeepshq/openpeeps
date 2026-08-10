import { useEffect, useRef } from 'react';
import { Dimensions, type View } from 'react-native';
import {
  useQueuePostView,
  type PostViewContext,
} from '@openpeepshq/react';

const VIEW_DELAY_MS = 1_000;
const POLL_INTERVAL_MS = 500;

/**
 * Attach the returned ref to a post container to batch-mark it seen after 1s
 * intersecting the window (React Native equivalent of web IntersectionObserver).
 */
export const usePostViewRef = (
  postId: string | undefined,
  viewContext?: PostViewContext,
) => {
  const queuePostView = useQueuePostView();
  const ref = useRef<View | null>(null);
  const viewContextRef = useRef(viewContext);
  viewContextRef.current = viewContext;

  useEffect(() => {
    if (!postId) return;

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
        queuePostView(postId, viewContextRef.current);
        viewTimer = undefined;
      }, VIEW_DELAY_MS);
    };

    const checkVisibility = () => {
      const node = ref.current;
      if (!node) return;

      node.measureInWindow((_x, y, _width, height) => {
        const windowHeight = Dimensions.get('window').height;
        const visible = y < windowHeight && y + height > 0;
        if (visible) startViewTimer();
        else clearViewTimer();
      });
    };

    const interval = setInterval(checkVisibility, POLL_INTERVAL_MS);
    checkVisibility();

    return () => {
      clearViewTimer();
      clearInterval(interval);
    };
  }, [postId, queuePostView]);

  return ref;
};
