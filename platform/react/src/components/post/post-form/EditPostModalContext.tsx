import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { EditPostModal } from './EditPostModal';

interface EditPostModalContextValue {
  openEditPost: (post: PublicPost) => void;
}

const EditPostModalContext = createContext<EditPostModalContextValue | null>(
  null,
);

export function EditPostModalProvider({ children }: { children: ReactNode }) {
  const [post, setPost] = useState<PublicPost | undefined>();

  const openEditPost = useCallback((next: PublicPost) => {
    setPost(next);
  }, []);

  return (
    <EditPostModalContext.Provider value={{ openEditPost }}>
      {children}
      {post ? (
        <EditPostModal post={post} onClose={() => setPost(undefined)} />
      ) : null}
    </EditPostModalContext.Provider>
  );
}

export function useEditPostModal() {
  const ctx = useContext(EditPostModalContext);
  if (!ctx) {
    throw new Error(
      'useEditPostModal must be used within EditPostModalProvider',
    );
  }
  return ctx;
}
