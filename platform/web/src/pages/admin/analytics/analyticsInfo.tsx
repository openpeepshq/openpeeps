import type { ReactNode } from 'react';
import { AnalyticsInfoBadge } from '@openpeepshq/react-ui';

/** Table header with a trailing clickable info badge. */
export const columnHeader = (label: string, info: string): ReactNode => (
  <span className="inline-flex items-center gap-1.5">
    <span>{label}</span>
    <AnalyticsInfoBadge label={label} info={info} />
  </span>
);
