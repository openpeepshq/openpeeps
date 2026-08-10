import { useCallback, useMemo, type ReactNode } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import {
  AnalyticsInfoBadge,
  DateRangeFilter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  LoadingSpinner,
  ShadcnButton,
} from '@openpeepshq/react-ui';
import { useOpenpeeps, useSetPageHeader, useT } from '@openpeepshq/react';
import { useAnalyticsRange } from './useAnalyticsRange';
import { AnalyticsRangeContext } from './AnalyticsRangeContext';

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
  const { range, setRange, queryParams } = useAnalyticsRange();

  const onExport = useCallback(
    async (format: 'csv' | 'pdf') => {
      const result = await client.admin.analytics.export({
        queryParameters: { ...queryParams, format },
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
    },
    [client, queryParams],
  );

  const headerActions = useMemo(
    () => (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <DateRangeFilter compact value={range} onChange={setRange} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ShadcnButton type="button" size="sm" variant="outline">
              {t('admin.analytics.export', { defaultValue: 'Export' })}
              <ChevronDown className="ml-1 size-3.5 opacity-70" />
            </ShadcnButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void onExport('csv')}>
              {t('admin.analytics.exportCsv', { defaultValue: 'Export CSV' })}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void onExport('pdf')}>
              {t('admin.analytics.exportPdf', { defaultValue: 'Export PDF' })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    [onExport, range, setRange, t],
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
      <div className="bg-surface-50 min-h-full space-y-5 p-4 sm:p-6">
        <nav className="border-border flex flex-wrap gap-1 border-b">
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
}: {
  title: string;
  /** Explanation shown from the section info badge. */
  info?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) => {
  const titleRow = (
    <div className="flex items-start justify-between gap-2">
      <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        {title}
      </h2>
      <div className="flex shrink-0 items-center gap-2">
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

  if (!collapsible) {
    return (
      <section
        className={`bg-background relative rounded-xl border p-4 shadow-sm ${className ?? ''}`}
      >
        <div className="mb-4">{titleRow}</div>
        {children}
      </section>
    );
  }

  return (
    <details
      open={defaultOpen}
      className={`bg-background group relative rounded-xl border p-4 shadow-sm ${className ?? ''}`}
    >
      <summary className="cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
        {titleRow}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
};
