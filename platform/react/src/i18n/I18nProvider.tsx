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
 * React port of @openpeepshq/svelte/I18nProvider. Provides an i18next instance
 * + bound `t` to the tree.
 */
export function I18nProvider({
  children,
  instance,
  fallback = null,
  lang,
}: I18nProviderProps) {
  const i18n = instance ?? i18next;
  const [ready, setReady] = useState(() => i18n.isInitialized);
  // Bump when language changes so context consumers get a fresh `t`.
  const [lng, setLng] = useState(() => i18n.language);

  useEffect(() => {
    if (lang && i18n.isInitialized && i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }
    const onReady = () => {
      setReady(true);
      setLng(i18n.language);
    };
    const onLanguageChanged = (next: string) => setLng(next);

    if (!i18n.isInitialized) {
      i18n.on('initialized', onReady);
    } else {
      setReady(true);
    }
    i18n.on('languageChanged', onLanguageChanged);
    return () => {
      i18n.off('initialized', onReady);
      i18n.off('languageChanged', onLanguageChanged);
    };
  }, [i18n, lang]);

  const value = useMemo(
    () => ({ i18n, t: i18n.t.bind(i18n) }),
    [i18n, lng],
  );

  if (!ready) return <>{fallback}</>;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
