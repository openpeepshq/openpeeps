import { createContext, useContext } from 'react';
import type { i18n as I18nInstance, TFunction } from 'i18next';

export interface I18nContextValue {
  i18n: I18nInstance;
  t: TFunction;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside an <I18nProvider>');
  }
  return ctx;
};

export const useT = (): TFunction => useI18n().t;
