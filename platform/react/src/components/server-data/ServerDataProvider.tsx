import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { OpenpeepsClient } from '@openpeeps/client';
import { ServerDataContext } from './context';

const handleResult = <T,>(r: { data: T } | { error: unknown }): T => {
  if ('data' in r) return r.data;
  throw r.error;
};

export interface ServerDataProviderProps {
  client: OpenpeepsClient;
  children?: ReactNode;
  fallback?: ReactNode;
}

export function ServerDataProvider({
  client,
  children,
  fallback = null,
}: ServerDataProviderProps) {
  const capabilitiesQuery = useQuery({
    queryKey: client.server.config.capabilities.queryKey({}),
    queryFn: () => client.server.config.capabilities().then(handleResult),
    retry: false,
  });
  const serverInfoQuery = useQuery({
    queryKey: client.server.info.queryKey({}),
    queryFn: () => client.server.info().then(handleResult),
    retry: false,
  });

  if (
    capabilitiesQuery.isLoading ||
    serverInfoQuery.isLoading ||
    !capabilitiesQuery.data ||
    !serverInfoQuery.data
  ) {
    return <>{fallback}</>;
  }

  return (
    <ServerDataContext.Provider
      value={{
        capabilities: capabilitiesQuery.data,
        serverInfo: serverInfoQuery.data,
      }}
    >
      {children}
    </ServerDataContext.Provider>
  );
}
