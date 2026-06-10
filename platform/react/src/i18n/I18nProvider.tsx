import { useEffect, useMemo, useState, type ReactNode } from 'react';
import i18next, { type i18n as I18nInstance } from 'i18next';
import { I18nContext } from './context';

export interface I18nProviderProps {
  children: ReactNode;
  /**
   * Optional pre-initialised i18n instance — when omitted we use the global
   * `i18next` instance and assume `initI18N(...)` has already been called.
   */
  instance?: I18nInstance;
  /** Render this fallback while the i18n instance is initializing. */
  fallback?: ReactNode;
  /** When provided, the provider will set the language at mount. */
  lang?: string;
}

/**
 * React port of @openpeeps/svelte/I18nProvider. Provides an i18next instance
 * + bound `t` to the tree.
 */
export function I18nProvider({
  children,
  instance,
  fallback = null,
  lang,
}: I18nProviderProps) {
  const [ready, setReady] = useState(() => (instance ?? i18next).isInitialized);

  useEffect(() => {
    const i18n = instance ?? i18next;
    if (lang && i18n.isInitialized) {
      void i18n.changeLanguage(lang);
    }
    if (!i18n.isInitialized) {
      const onInitialized = () => setReady(true);
      i18n.on('initialized', onInitialized);
      return () => {
        i18n.off('initialized', onInitialized);
      };
    }
    setReady(true);
    return undefined;
  }, [instance, lang]);

  const value = useMemo(() => {
    const i18n = instance ?? i18next;
    return { i18n, t: i18n.t.bind(i18n) };
  }, [instance]);

  if (!ready) return <>{fallback}</>;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
