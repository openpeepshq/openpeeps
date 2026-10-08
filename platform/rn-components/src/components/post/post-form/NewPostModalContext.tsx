import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { GroupWithMeta, VisibilityType } from '@openpeepshq/common';
import { navigationRef } from '~/components/navigation/nativeRouter';
import {
  postDataDefaults,
  useLocalPostStore,
} from '~/stores/useLocalPostStore';

export interface NewPostOptions {
  visibility?: VisibilityType;
  group?: GroupWithMeta;
  initialContent?: string;
}

interface NewPostModalContextValue {
  openNewPost: (options?: NewPostOptions) => void;
}

const NewPostModalContext = createContext<NewPostModalContextValue | null>(
  null
);

/**
 * Native counterpart of the web modal: seeds the composer store and opens the
 * full-screen `NewPost` tab instead of rendering a dialog.
 */
export const NewPostModalProvider = ({ children }: { children: ReactNode }) => {
  const setPostData = useLocalPostStore((state) => state.setPostData);

  const openNewPost = useCallback(
    (options?: NewPostOptions) => {
      const base = postDataDefaults();
      setPostData({
        ...base,
        visibility: options?.group
          ? 'group'
          : (options?.visibility ?? base.visibility),
        groupId: options?.group?.id,
        data: { type: 'note', content: options?.initialContent ?? '' },
      });
      if (!navigationRef.isReady()) return;
      navigationRef.navigate('Main', {
        screen: 'TabNavigator',
        params: {
          screen: 'NewPost',
          params: {
            originatorId: options?.group?.id,
            triggeredFrom: options?.group ? 'group' : undefined,
            withContent: !!options?.initialContent,
          },
        },
      });
    },
    [setPostData]
  );

  const value = useMemo(() => ({ openNewPost }), [openNewPost]);
  return (
    <NewPostModalContext.Provider value={value}>
      {children}
    </NewPostModalContext.Provider>
  );
};

export const useNewPostModal = () => {
  const ctx = useContext(NewPostModalContext);
  if (!ctx) {
    throw new Error('useNewPostModal must be used within NewPostModalProvider');
  }
  return ctx;
};
