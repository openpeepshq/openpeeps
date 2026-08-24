import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import {
  AnalyticsInfoBadge,
  Button,
  DateRangeFilter,
  LoadingSpinner,
  type DateRangeValue,
} from '@openpeepshq/react-ui';
import { useOpenpeeps, useSetPageHeader, useT } from '../../../index';
import { AnalyticsRangeContext } from './AnalyticsRangeContext';
import { downloadCsv } from './downloadCsv';

const tabs = [
  {
    to: '/admin/analytics',
    end: true,
    labelKey: 'overview',
    fallback: 'Overview',
  },
  {
    to: '/admin/analytics/members',
    labelKey: 'members',
    fallback: 'Members',
  },
  {
    to: '/admin/analytics/content',
    labelKey: 'content',
    fallback: 'Content',
  },
  {
    to: '/admin/analytics/engagement',
    labelKey: 'engagement',
    fallback: 'Engagement',
  },
  {
    to: '/admin/analytics/groups',
    labelKey: 'groups',
    fallback: 'Groups',
  },
  {
    to: '/admin/analytics/reports',
    labelKey: 'reports',
    fallback: 'Reports',
  },
] as const;

export const AnalyticsLayout = () => {
  const t = useT();
  const location = useLocation();
  const { client } = useOpenpeeps();
  const [range, setRange] = useState<DateRangeValue>({ preset: '30d' });
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (range.preset) params.preset = range.preset;
    if (range.from) params.from = range.from;
    if (range.to) params.to = range.to;
    return params;
  }, [range]);

  const onExportPdf = useCallback(async () => {
    const result = await client.admin.analytics.export({
      queryParameters: { ...queryParams, format: 'pdf' },
    });
    if ('error' in result) return;
    const { filename, content, encoding, contentType } = result.data;
    const blob =
      encoding === 'base64'
        ? new Blob([Uint8Array.from(atob(content), (c) => c.charCodeAt(0))], {
            type: contentType,
          })
        : new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [client, queryParams]);

  const headerActions = useMemo(
    () => (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <DateRangeFilter compact value={range} onChange={setRange} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void onExportPdf()}
        >
          {t('admin.analytics.exportPdf', { defaultValue: 'Export PDF' })}
        </Button>
      </div>
    ),
    [onExportPdf, range, setRange, t],
  );

  useSetPageHeader(
    t('admin.analytics.title', { defaultValue: 'Analytics' }),
    headerActions,
  );

  if (location.pathname === '/admin/analytics/growth') {
    return <Navigate to="/admin/analytics/members" replace />;
  }
  if (location.pathname === '/admin/analytics/retention') {
    return <Navigate to="/admin/analytics/members" replace />;
  }

  return (
    <AnalyticsRangeContext.Provider value={{ range, setRange, queryParams }}>
      <div className="bg-background min-h-full min-w-0 space-y-5 p-4 sm:p-6">
        <nav
          aria-label={t('admin.analytics.tabsLabel', {
            defaultValue: 'Analytics sections',
          })}
          className="border-border flex flex-wrap gap-1 border-b"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={'end' in tab ? tab.end : false}
              className={({ isActive }) =>
                `-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                }`
              }
            >
              {t(`admin.analytics.tabs.${tab.labelKey}`, {
                defaultValue: tab.fallback,
              })}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </AnalyticsRangeContext.Provider>
  );
};

export const AnalyticsLoading = () => (
  <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
    <LoadingSpinner />
  </div>
);

export const AnalyticsSection = ({
  title,
  info,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  csvRows,
  csvFilename,
}: {
  title: string;
  /** Explanation shown from the section info badge. */
  info?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  csvRows?: Array<Array<string | number>>;
  csvFilename?: string;
}) => {
  const t = useT();
  const titleRow = (
    <div className="flex items-start justify-between gap-2">
      <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        {title}
      </h2>
      <div className="flex shrink-0 items-center gap-2">
        {csvRows && csvRows.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              downloadCsv(csvFilename ?? 'analytics.csv', csvRows);
            }}
          >
            {t('admin.analytics.sectionCsv', { defaultValue: 'CSV' })}
          </Button>
        ) : null}
        {info ? <AnalyticsInfoBadge label={title} info={info} /> : null}
        {collapsible ? (
          <ChevronDown
            aria-hidden
            className="text-muted-foreground size-4 transition-transform group-open:rotate-180"
          />
        ) : null}
      </div>
    </div>
  );

  // min-w-0 lets grid/flex parents shrink the card; overflow-x-auto keeps
  // wide tables and charts inside the rounded border on narrow viewports.
  const shellClass = `bg-background relative min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm ${className ?? ''}`;

  if (!collapsible) {
    return (
      <section className={shellClass}>
        <div className="mb-4">{titleRow}</div>
        <div className="min-w-0 overflow-x-auto">{children}</div>
      </section>
    );
  }

  return (
    <details open={defaultOpen} className={`group ${shellClass}`}>
      <summary className="cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
        {titleRow}
      </summary>
      <div className="mt-4 min-w-0 overflow-x-auto">{children}</div>
    </details>
  );
};
