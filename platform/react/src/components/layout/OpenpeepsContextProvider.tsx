import { useEffect, type ReactNode } from 'react';
import {
  initializeNewPostStores,
  initializePageStores,
  usePageHeader,
} from '../../stores';
import { useServerInfo } from '../server-data';
import { PostViewCounterProvider } from '../../lib/postViewCounter';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useHasAuthToken } from '../../contexts/openpeeps/hooks/useHasAuthToken';
import { ReplyModalProvider } from '../post/post-form/ReplyModalContext';
import { NewPostModalProvider } from '../post/post-form/NewPostModalContext';
import { EditPostModalProvider } from '../post/post-form/EditPostModalContext';
import { CreateNewConversationProvider } from '../conversations/CreateNewConversationContext';
import { CreateNewJamProvider } from '../jams/CreateNewJamContext';
import { SignUpLoginModalProvider } from '../accounts/SignUpLoginModalContext';
import { ToastProvider } from './ToastProvider';

function PostViewTracking({ children }: { children: ReactNode }) {
  const { openpeepsApi } = useOpenpeeps();
  const hasToken = useHasAuthToken();
  const markPostsSeenAction = openpeepsApi.markPostsSeenAction();

  return (
    <PostViewCounterProvider
      hasAuthToken={hasToken}
      markPostsSeen={async (postIds) => {
        await markPostsSeenAction({ postIds });
      }}
    >
      {children}
    </PostViewCounterProvider>
  );
}

export interface OpenpeepsContextProviderProps {
  children?: ReactNode;
}

/**
 * Translation of @openpeeps/svelte/components/layout/OpenpeepsContextProvider.
 * Initialises the new-post + page-level stores and updates `document.title`
 * based on the active page header.
 */
export function OpenpeepsContextProvider({
  children,
}: OpenpeepsContextProviderProps) {
  const serverInfo = useServerInfo();
  const pageHeader = usePageHeader();

  useEffect(() => {
    initializeNewPostStores(!!serverInfo.publicContent);
    initializePageStores();
  }, [serverInfo.publicContent]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const name = serverInfo.communityConfig?.info.name ?? '';
    const title =
      pageHeader && typeof pageHeader.title === 'string'
        ? `${name} - ${pageHeader.title}`
        : name;
    document.title = title;
  }, [pageHeader, serverInfo.communityConfig?.info.name]);

  return (
    <ToastProvider>
      <PostViewTracking>
        <SignUpLoginModalProvider>
          <ReplyModalProvider>
            <NewPostModalProvider>
              <EditPostModalProvider>
                <CreateNewConversationProvider>
                  <CreateNewJamProvider>{children}</CreateNewJamProvider>
                </CreateNewConversationProvider>
              </EditPostModalProvider>
            </NewPostModalProvider>
          </ReplyModalProvider>
        </SignUpLoginModalProvider>
      </PostViewTracking>
    </ToastProvider>
  );
}
