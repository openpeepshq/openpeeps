import { useMemo, useState } from 'react';
import type { DateRangeValue } from '@openpeeps/react-ui';

export const useAnalyticsRange = () => {
  const [range, setRange] = useState<DateRangeValue>({ preset: '30d' });

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (range.preset) params.preset = range.preset;
    if (range.from) params.from = range.from;
    if (range.to) params.to = range.to;
    return params;
  }, [range]);

  return { range, setRange, queryParams };
};
