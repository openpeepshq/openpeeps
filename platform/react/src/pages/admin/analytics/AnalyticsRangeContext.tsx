import { createContext, useContext } from 'react';
import type { DateRangeValue } from '@openpeepshq/react-ui';

type AnalyticsRangeContextValue = {
  range: DateRangeValue;
  setRange: (value: DateRangeValue) => void;
  queryParams: Record<string, string>;
};

export const AnalyticsRangeContext =
  createContext<AnalyticsRangeContextValue | null>(null);

export const useAnalyticsRangeContext = () => {
  const ctx = useContext(AnalyticsRangeContext);
  if (!ctx) {
    throw new Error(
      'useAnalyticsRangeContext must be used within AnalyticsLayout',
    );
  }
  return ctx;
};
