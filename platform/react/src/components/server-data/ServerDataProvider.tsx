import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { OpenpeepsClient } from '@openpeepshq/client';
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
    // #region agent log
    fetch('http://127.0.0.1:7499/ingest/27c2d08d-4470-4015-abd2-33d1e0e3ecd8', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'a0a46a',
      },
      body: JSON.stringify({
        sessionId: 'a0a46a',
        hypothesisId: 'B',
        location: 'ServerDataProvider.tsx:fallback',
        message: 'server data still blocked',
        data: {
          capLoading: capabilitiesQuery.isLoading,
          infoLoading: serverInfoQuery.isLoading,
          capHasData: !!capabilitiesQuery.data,
          infoHasData: !!serverInfoQuery.data,
          capStatus: capabilitiesQuery.status,
          infoStatus: serverInfoQuery.status,
          capError:
            capabilitiesQuery.error instanceof Error
              ? capabilitiesQuery.error.message
              : capabilitiesQuery.error
                ? String(capabilitiesQuery.error)
                : null,
          infoError:
            serverInfoQuery.error instanceof Error
              ? serverInfoQuery.error.message
              : serverInfoQuery.error
                ? String(serverInfoQuery.error)
                : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    console.warn(
      '[dbg-B] server data blocked',
      JSON.stringify({
        capStatus: capabilitiesQuery.status,
        infoStatus: serverInfoQuery.status,
        capHasData: !!capabilitiesQuery.data,
        infoHasData: !!serverInfoQuery.data,
        capError:
          capabilitiesQuery.error instanceof Error
            ? capabilitiesQuery.error.message
            : capabilitiesQuery.error
              ? String(capabilitiesQuery.error)
              : null,
        infoError:
          serverInfoQuery.error instanceof Error
            ? serverInfoQuery.error.message
            : serverInfoQuery.error
              ? String(serverInfoQuery.error)
              : null,
      }),
    );
    // #endregion
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
