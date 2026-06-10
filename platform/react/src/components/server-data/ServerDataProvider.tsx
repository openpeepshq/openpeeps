import { useEffect, useState, type ReactNode } from 'react';
import type { OpenpeepsClient } from '@openpeeps/client';
import { ServerDataContext } from './context';
import type { ServerDataContextValue } from './types';

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
  const [value, setValue] = useState<ServerDataContextValue | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      client.server.config.capabilities().then(handleResult),
      client.server.info().then(handleResult),
    ]).then(([capabilities, serverInfo]) => {
      if (!cancelled) setValue({ capabilities, serverInfo });
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  if (!value) return <>{fallback}</>;

  return (
    <ServerDataContext.Provider value={value}>
      {children}
    </ServerDataContext.Provider>
  );
}
