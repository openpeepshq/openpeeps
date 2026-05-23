import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { GroupWithMeta, VisibilityType } from '@openpeeps/common';
import { NewPostModal } from './NewPostModal';

export interface NewPostOptions {
  visibility?: VisibilityType;
  group?: GroupWithMeta;
}

interface NewPostModalContextValue {
  openNewPost: (options?: NewPostOptions) => void;
}

const NewPostModalContext = createContext<NewPostModalContextValue | null>(
  null,
);

export function NewPostModalProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<NewPostOptions | undefined>();

  const openNewPost = useCallback((opts?: NewPostOptions) => {
    setOptions(opts ?? {});
  }, []);

  return (
    <NewPostModalContext.Provider value={{ openNewPost }}>
      {children}
      {options !== undefined ? (
        <NewPostModal
          visibility={options.visibility}
          group={options.group}
          onClose={() => setOptions(undefined)}
        />
      ) : null}
    </NewPostModalContext.Provider>
  );
}

export function useNewPostModal() {
  const ctx = useContext(NewPostModalContext);
  if (!ctx) {
    throw new Error('useNewPostModal must be used within NewPostModalProvider');
  }
  return ctx;
}
