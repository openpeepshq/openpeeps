import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { PublicProfile } from '@openpeepshq/common/types';
import { navigationRef } from '../navigation/nativeRouter';
import { useNewConversationStore } from '../../stores/useNewConversationStore';

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

/**
 * Native counterpart of the web modal: seeds the draft store and opens the
 * member picker or the draft screen instead of rendering a dialog.
 */
export const CreateNewConversationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { clearMembers, setMember, setContt } = useNewConversationStore();

  const openCreateConversation = useCallback(
    (options?: CreateConversationOptions) => {
      clearMembers();
      options?.profiles?.forEach((profile) => setMember(profile));
      setContt(options?.message ?? '');
      if (!navigationRef.isReady()) return;
      navigationRef.navigate('Main', {
        screen:
          options?.skipProfileSelection && options.profiles?.length
            ? 'DraftMessage'
            : 'SelectPrivateMessageMembers',
      });
    },
    [clearMembers, setMember, setContt]
  );

  const value = useMemo(
    () => ({ openCreateConversation }),
    [openCreateConversation]
  );
  return (
    <CreateNewConversationContext.Provider value={value}>
      {children}
    </CreateNewConversationContext.Provider>
  );
};

export const useCreateNewConversation = () => {
  const ctx = useContext(CreateNewConversationContext);
  if (!ctx) {
    throw new Error(
      'useCreateNewConversation must be used within CreateNewConversationProvider'
    );
  }
  return ctx;
};
