import {
  createContext,
  ComponentType,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type PlusButtonAction = {
  action: string | (() => Promise<unknown> | unknown);
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  title?: string;
};

export type PlusButtonActions =
  | PlusButtonAction
  | PlusButtonAction[]
  | undefined;

export type PageHeaderValue = {
  title?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
};

type PageChromeSetters = {
  setHeader: (header: PageHeaderValue | undefined) => void;
  setPlus: (plus: PlusButtonActions) => void;
};

type PageChromeValues = {
  header: PageHeaderValue | undefined;
  plus: PlusButtonActions;
};

/**
 * Stable setters context. Its value never changes, so components that call
 * `useSetPageHeader` / `useSetPlusButtonActions` are not re-rendered when
 * the chrome values change. Keeping the setters out of the value context is
 * what prevents infinite update loops ("Maximum update depth exceeded") for
 * pages that register a fresh, non-memoized header element or plus-actions
 * object on every render.
 */
const PageChromeSettersContext = createContext<PageChromeSetters | null>(null);

/**
 * Chrome values context. Its value changes whenever the header or plus
 * actions change, so it must only be consumed by display components
 * (header/plus button) — never by a component that registers the values.
 */
const PageChromeValuesContext = createContext<PageChromeValues | null>(null);

const MISSING_CHROME_ERROR = 'Page chrome hooks must be used within RootLayout';

export const PageChromeProvider = ({ children }: { children: ReactNode }) => {
  const [header, setHeader] = useState<PageHeaderValue | undefined>();
  const [plus, setPlus] = useState<PlusButtonActions>(undefined);
  // useState setters are stable, so this value is created exactly once.
  const setters = useMemo(() => ({ setHeader, setPlus }), [setHeader, setPlus]);
  const values = useMemo(() => ({ header, plus }), [header, plus]);
  return (
    <PageChromeSettersContext.Provider value={setters}>
      <PageChromeValuesContext.Provider value={values}>
        {children}
      </PageChromeValuesContext.Provider>
    </PageChromeSettersContext.Provider>
  );
};

const useSetters = () => {
  const ctx = useContext(PageChromeSettersContext);
  if (!ctx) {
    throw new Error(MISSING_CHROME_ERROR);
  }
  return ctx;
};

const useValues = () => {
  const ctx = useContext(PageChromeValuesContext);
  if (!ctx) {
    throw new Error(MISSING_CHROME_ERROR);
  }
  return ctx;
};

export const usePageChrome = () => {
  const values = useValues();
  const setters = useSetters();
  return { ...values, ...setters };
};

export const useSetPageHeader = (
  title?: ReactNode,
  actions?: ReactNode,
  onBack?: () => void
) => {
  const { setHeader } = useSetters();
  useLayoutEffect(() => {
    setHeader({ title, actions, onBack });
    return () => setHeader(undefined);
  }, [actions, onBack, setHeader, title]);
};

export const useSetPlusButtonActions = (actions: PlusButtonActions) => {
  const { setPlus } = useSetters();
  useLayoutEffect(() => {
    setPlus(actions);
    return () => setPlus(undefined);
  }, [actions, setPlus]);
};
