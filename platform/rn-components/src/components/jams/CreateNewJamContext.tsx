import React, { createContext, useCallback, useContext } from 'react';
import { navigationRef } from '~/components/navigation/nativeRouter';

interface CreateNewJamContextValue {
  openCreateJam: () => void;
}

const CreateNewJamContext = createContext<CreateNewJamContextValue | null>(
  null
);

/** Native stand-in for the web modal: the jam composer is a full-screen page. */
export const CreateNewJamProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const openCreateJam = useCallback(() => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Main', { screen: 'CreateNewJam' });
  }, []);

  return (
    <CreateNewJamContext.Provider value={{ openCreateJam }}>
      {children}
    </CreateNewJamContext.Provider>
  );
};

export const useCreateNewJam = () => {
  const ctx = useContext(CreateNewJamContext);
  if (!ctx) {
    throw new Error('useCreateNewJam must be used within CreateNewJamProvider');
  }
  return ctx;
};
