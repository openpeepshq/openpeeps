import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { GroupWithMeta, VisibilityType } from '@openpeeps/common';
import { useToast } from '../../layout/ToastProvider';
import { NewPostModal } from './NewPostModal';

export interface NewPostOptions {
  visibility?: VisibilityType;
  group?: GroupWithMeta;
  initialContent?: string;
}

interface NewPostModalContextValue {
  openNewPost: (options?: NewPostOptions) => void;
}

const NewPostModalContext = createContext<NewPostModalContextValue | null>(
  null,
);

export function NewPostModalProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<NewPostOptions | undefined>();
  const { toast, error } = useToast();

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
          initialContent={options.initialContent}
          onClose={() => setOptions(undefined)}
          onToast={({ type, message }) =>
            type === 'error' ? error(message) : toast(message)
          }
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
