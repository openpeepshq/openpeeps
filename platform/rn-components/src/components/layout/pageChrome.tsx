import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type PlusButtonAction = {
  action: string | (() => Promise<unknown> | unknown);
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

type PageChromeContextValue = {
  header: PageHeaderValue | undefined;
  setHeader: (header: PageHeaderValue | undefined) => void;
  plus: PlusButtonActions;
  setPlus: (plus: PlusButtonActions) => void;
};

const PageChromeContext = createContext<PageChromeContextValue | null>(null);

export const PageChromeProvider = ({ children }: { children: ReactNode }) => {
  const [header, setHeader] = useState<PageHeaderValue | undefined>();
  const [plus, setPlus] = useState<PlusButtonActions>(undefined);
  const value = useMemo(
    () => ({ header, setHeader, plus, setPlus }),
    [header, plus]
  );
  return (
    <PageChromeContext.Provider value={value}>
      {children}
    </PageChromeContext.Provider>
  );
};

export const usePageChrome = () => {
  const ctx = useContext(PageChromeContext);
  if (!ctx) {
    throw new Error('usePageChrome must be used within RootLayout');
  }
  return ctx;
};

export const useSetPageHeader = (
  title?: ReactNode,
  actions?: ReactNode,
  onBack?: () => void
) => {
  const { setHeader } = usePageChrome();
  useLayoutEffect(() => {
    setHeader({ title, actions, onBack });
    return () => setHeader(undefined);
  }, [actions, onBack, setHeader, title]);
};

export const useSetPlusButtonActions = (actions: PlusButtonActions) => {
  const { setPlus } = usePageChrome();
  useLayoutEffect(() => {
    setPlus(actions);
    return () => setPlus(undefined);
  }, [actions, setPlus]);
};
