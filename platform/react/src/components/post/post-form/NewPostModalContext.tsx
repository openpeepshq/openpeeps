import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { GroupWithMeta, VisibilityType } from '@openpeeps/common';
import { Toast } from '@openpeeps/react-ui';
import { NewPostModal, type NewPostToast } from './NewPostModal';

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
  // The modal always closes after publishing (success or error); keep the
  // toast here so it survives the modal unmounting, mirroring the Svelte app's
  // global toast store.
  const [toast, setToast] = useState<NewPostToast | null>(null);

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
          onToast={setToast}
        />
      ) : null}
      {toast ? (
        <Toast variant={toast.type} onDismiss={() => setToast(null)}>
          {toast.message}
        </Toast>
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
