import { createContext, useContext } from 'react';
import type { ServerDataContextValue } from './types';

export const ServerDataContext = createContext<ServerDataContextValue | null>(
  null,
);

export const useServerData = (): ServerDataContextValue => {
  const ctx = useContext(ServerDataContext);
  if (!ctx)
    throw new Error('useServerData must be used inside <ServerDataProvider>');
  return ctx;
};

export const useServerInfo = () => useServerData().serverInfo;
export const useCapabilities = () => useServerData().capabilities;
