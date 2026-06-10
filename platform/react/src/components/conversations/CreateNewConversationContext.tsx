import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { PublicProfile } from '@openpeeps/common/types';
import { CreateNewConversation } from './CreateNewConversation';

export interface CreateConversationOptions {
  profiles?: PublicProfile[];
  message?: string;
  skipProfileSelection?: boolean;
}

interface CreateNewConversationContextValue {
  openCreateConversation: (options?: CreateConversationOptions) => void;
}

const CreateNewConversationContext =
  createContext<CreateNewConversationContextValue | null>(null);

export function CreateNewConversationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [options, setOptions] = useState<
    CreateConversationOptions | undefined
  >();

  const openCreateConversation = useCallback(
    (opts?: CreateConversationOptions) => {
      setOptions(opts ?? {});
    },
    [],
  );

  return (
    <CreateNewConversationContext.Provider value={{ openCreateConversation }}>
      {children}
      {options !== undefined ? (
        <CreateNewConversation
          profiles={options.profiles}
          message={options.message}
          skipProfileSelection={options.skipProfileSelection}
          onClose={() => setOptions(undefined)}
        />
      ) : null}
    </CreateNewConversationContext.Provider>
  );
}

export function useCreateNewConversation() {
  const ctx = useContext(CreateNewConversationContext);
  if (!ctx) {
    throw new Error(
      'useCreateNewConversation must be used within CreateNewConversationProvider',
    );
  }
  return ctx;
}
