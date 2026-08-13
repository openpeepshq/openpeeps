import React, {
  useCallback,
  useEffect,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import {
  OpenpeepsProvider as BaseOpenpeepsProvider,
  PostViewCounterProvider,
  AnalyticsClickTracker,
  adjustUnseenCounts,
  invalidateUnseenCounts,
  useHasAuthToken,
  useOpenpeeps,
  usePostViewFlush,
  type PostViewContext,
} from '@openpeepshq/react';

type BaseProps = ComponentProps<typeof BaseOpenpeepsProvider>;

const PostViewFlushOnBackground = () => {
  const flushPostViews = usePostViewFlush();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        void flushPostViews();
      }
    });
    return () => subscription.remove();
  }, [flushPostViews]);

  return null;
};

const PostViewTracking = ({ children }: { children: ReactNode }) => {
  const { openpeepsApi, queryClient, client } = useOpenpeeps();
  const hasToken = useHasAuthToken();
  const markPostsSeenAction = openpeepsApi.markPostsSeenAction();

  const handlePostQueued = useCallback(
    (_postId: string, viewContext?: PostViewContext) => {
      if (!viewContext?.adjustUnread) return;

      if (viewContext.groupId) {
        adjustUnseenCounts(queryClient, client, {
          groupId: viewContext.groupId,
        });
      }

      if (viewContext.conversationRootId) {
        adjustUnseenCounts(queryClient, client, {
          conversationRootId: viewContext.conversationRootId,
        });
      }
    },
    [client, queryClient],
  );

  const handleFlushFailed = useCallback(() => {
    void invalidateUnseenCounts(queryClient, client);
  }, [client, queryClient]);

  return (
    <PostViewCounterProvider
      hasAuthToken={hasToken}
      markPostsSeen={async postIds => {
        await markPostsSeenAction({ postIds });
      }}
      onPostQueued={handlePostQueued}
      onFlushFailed={handleFlushFailed}>
      <PostViewFlushOnBackground />
      <AnalyticsClickTracker />
      {children}
    </PostViewCounterProvider>
  );
};

/**
 * React Native flavor of `OpenpeepsProvider`. Identical to the web provider
 * exported by `@openpeepshq/react`, but pre-wires `subscribeToForeground` to
 * React Native's `AppState` so token refresh happens when the app returns to
 * the foreground, and mounts post-view tracking for read/unread parity.
 *
 * `@openpeepshq/react` deliberately has no `react-native` import — this wrapper
 * is the single place where the dependency lives. Host apps should import
 * `OpenpeepsProvider` from `@openpeepshq/react-native` (not from
 * `@openpeepshq/react`) so this wiring is in place.
 */
export const OpenpeepsProvider: React.FC<
  Omit<BaseProps, 'subscribeToForeground'>
> = ({ children, ...props }) => {
  const subscribeToForeground = useCallback((onForeground: () => void) => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') onForeground();
    });
    return () => subscription.remove();
  }, []);

  return (
    <BaseOpenpeepsProvider
      {...props}
      subscribeToForeground={subscribeToForeground}>
      <PostViewTracking>{children}</PostViewTracking>
    </BaseOpenpeepsProvider>
  );
};
