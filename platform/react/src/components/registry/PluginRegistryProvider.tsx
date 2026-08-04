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
};

type PluginRegistryContextValue = {
  registerComponent: RegistryApi['registerComponent'];
  getComponentsForSlot: (slot: string) => PluginComponentEntry[];
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
    window[PLUGIN_REGISTRY_GLOBAL_KEY] = {
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

const PluginRegistryContext = createContext<PluginRegistryContextValue | null>(
  null,
);

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
      value={{ registerComponent, getComponentsForSlot }}
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
