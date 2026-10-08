import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { navigationRef } from '~/components/navigation/nativeRouter';

interface EditPostModalContextValue {
  openEditPost: (post: PublicPost) => void;
}

const EditPostModalContext = createContext<EditPostModalContextValue | null>(
  null
);

/** Native counterpart of the web modal: opens the full-screen `EditPost` page. */
export const EditPostModalProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const openEditPost = useCallback((post: PublicPost) => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Main', {
      screen: 'EditPost',
      params: { id: post.id },
    });
  }, []);

  const value = useMemo(() => ({ openEditPost }), [openEditPost]);
  return (
    <EditPostModalContext.Provider value={value}>
      {children}
    </EditPostModalContext.Provider>
  );
};

export const useEditPostModal = () => {
  const ctx = useContext(EditPostModalContext);
  if (!ctx) {
    throw new Error(
      'useEditPostModal must be used within EditPostModalProvider'
    );
  }
  return ctx;
};
