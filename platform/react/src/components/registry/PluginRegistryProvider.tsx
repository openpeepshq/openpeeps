import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ComponentType,
  type ReactNode,
} from 'react';

type PluginComponentEntry = {
  key: string;
  component: ComponentType<Record<string, unknown>>;
};

type PluginRegistryMap = Record<string, PluginComponentEntry[]>;

type RegistryApi = {
  registerComponent: (
    slot: string,
    key: string,
    component: ComponentType<Record<string, unknown>>,
  ) => void;
  /**
   * An authenticated `fetch` for same-origin plugin API calls. Plugin assets
   * are plain scripts (no bundle, no token access), and the app authenticates
   * with a Bearer token stored in `credentialsStore` — never a cookie — so a
   * bare `fetch(..., { credentials: 'include' })` from an asset sends nothing
   * and every secured plugin route 401s. The host assigns this alongside
   * `window.React`; assets call `authFetch` instead of `fetch` for their
   * `/api/openpeeps/core/v1/plugins/...` endpoints.
   */
  authFetch: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
};

type PluginRegistryContextValue = {
  registerComponent: RegistryApi['registerComponent'];
  getComponentsForSlot: (slot: string) => PluginComponentEntry[];
  listSlots: (prefix?: string) => string[];
};

const PLUGIN_REGISTRY_GLOBAL_KEY = '__OPENPEEPS_PLUGINS__';

type QueuedRegistration = {
  slot: string;
  key: string;
  component: ComponentType<Record<string, unknown>>;
};

const pendingQueue: QueuedRegistration[] = [];
const registryController: { current: RegistryApi['registerComponent'] | null } =
  { current: null };

const EMPTY_COMPONENTS: PluginComponentEntry[] = [];

declare global {
  interface Window {
    [PLUGIN_REGISTRY_GLOBAL_KEY]?: RegistryApi;
  }
}

if (typeof window !== 'undefined') {
  if (!window[PLUGIN_REGISTRY_GLOBAL_KEY]) {
    // An authenticated `fetch` for plugin API calls: the app stores a Bearer
    // token (no cookie), so assets must attach it themselves to call secured
    // plugin routes. Reads the live token on every call so sign-in/out is
    // picked up without a reload.
    const authFetch = async (
      input: RequestInfo | URL,
      init: RequestInit = {},
    ): Promise<Response> => {
      const { credentialsStore } = await import('../../auth/credentials');
      const credentials = await credentialsStore.get();
      const headers = new Headers(init.headers);
      if (credentials?.token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${credentials.token}`);
      }
      return fetch(input, { ...init, headers });
    };
    window[PLUGIN_REGISTRY_GLOBAL_KEY] = {
      authFetch,
      registerComponent: (slot, key, component) => {
        if (registryController.current) {
          registryController.current(slot, key, component);
        } else {
          pendingQueue.push({ slot, key, component });
        }
      },
    };
  }

  (window as unknown as { React: typeof React }).React = React;
}

export const PluginRegistryContext =
  createContext<PluginRegistryContextValue | null>(null);

export const PluginRegistryProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [components, setComponents] = useState<PluginRegistryMap>({});

  const registerComponent: RegistryApi['registerComponent'] = useCallback(
    (slot, key, component) => {
      setComponents((prev) => {
        const list = prev[slot] ?? [];
        const filtered = list.filter((entry) => entry.key !== key);
        return {
          ...prev,
          [slot]: [...filtered, { key, component }],
        };
      });
    },
    [],
  );

  const getComponentsForSlot = useCallback(
    (slot: string) => components[slot] ?? EMPTY_COMPONENTS,
    [components],
  );

  const listSlots = useCallback(
    (prefix?: string) =>
      Object.entries(components)
        .filter(
          ([slot, entries]) =>
            entries.length > 0 &&
            (prefix === undefined || slot.startsWith(prefix)),
        )
        .map(([slot]) => slot)
        .sort(),
    [components],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    registryController.current = registerComponent;

    while (pendingQueue.length > 0) {
      const item = pendingQueue.shift()!;
      registerComponent(item.slot, item.key, item.component);
    }

    return () => {
      registryController.current = null;
    };
  }, [registerComponent]);

  return (
    <PluginRegistryContext.Provider
      value={{ registerComponent, getComponentsForSlot, listSlots }}
    >
      {children}
    </PluginRegistryContext.Provider>
  );
};

export const usePluginRegistry = () => {
  const context = useContext(PluginRegistryContext);
  if (!context) {
    throw new Error(
      'usePluginRegistry must be used within a PluginRegistryProvider',
    );
  }
  return context;
};
