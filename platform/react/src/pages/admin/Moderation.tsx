import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReportWithMeta } from '@openpeepshq/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Avatar } from '../../components';
import { UpdatingDate } from '@openpeepshq/react-ui';
import { Button } from '@openpeepshq/react-ui';

type Tab = 'summary' | 'resolved';

export function AdminModeration() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const reportsQuery = openpeepsApi.admin.useReportsList();
  const [tab, setTab] = useState<Tab>('summary');

  useSetPageHeader(t('admin.moderation.title', { defaultValue: 'Moderation' }));

  const reports = reportsQuery.data ?? [];

  return (
    <div className="space-y-4 p-4">
      <nav
        aria-label={t('admin.moderation.tabsLabel', {
          defaultValue: 'Moderation sections',
        })}
        className="border-border flex border-b"
      >
        <TabButton active={tab === 'summary'} onClick={() => setTab('summary')}>
          {t('admin.moderation.summaryTab', { defaultValue: 'Summary' })}
        </TabButton>
        <TabButton
          active={tab === 'resolved'}
          onClick={() => setTab('resolved')}
        >
          {t('admin.moderation.resolvedTab', { defaultValue: 'Resolved' })}
        </TabButton>
      </nav>

      {tab === 'summary' ? (
        <SummaryTab reports={reports} />
      ) : (
        <ResolvedTab reports={reports} />
      )}
    </div>
  );
}

function SummaryTab({ reports }: { reports: ReportWithMeta[] }) {
  const t = useT();

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { profile: ReportWithMeta['reportedProfile']; reports: ReportWithMeta[] }
    >();
    for (const report of reports) {
      const key = String(report.reportedProfile.id);
      if (!map.has(key)) {
        map.set(key, { profile: report.reportedProfile, reports: [] });
      }
      map.get(key)!.reports.push(report);
    }
    return Array.from(map.values()).filter((g) =>
      g.reports.some((r) => !r.resolution),
    );
  }, [reports]);

  if (grouped.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('admin.moderation.report.resolvedBadge', {
          defaultValue: 'All reports resolved',
        })}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {grouped.map(({ profile, reports: profileReports }) => {
        const unresolved = profileReports.filter((r) => !r.resolution).length;
        return (
          <li key={profile.id}>
            <Link
              to={`/admin/moderation/reports/@${profile.handle}`}
              className="hover:bg-surface flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar profile={profile} size={2} />
                <div>
                  <p className="font-medium">
                    {profile.displayName || `@${profile.handle}`}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    @{profile.handle}
                  </p>
                </div>
              </div>
              <span className="bg-error rounded-full px-3 py-1 text-xs text-white">
                {t('admin.moderation.report.unresolvedBadge', {
                  defaultValue: '{{reportsCount}} unresolved reports',
                  reportsCount: unresolved,
                })}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ResolvedTab({ reports }: { reports: ReportWithMeta[] }) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const reopenReport = openpeepsApi.admin.reopenReportAction();

  const resolved = reports.filter((r) => !!r.resolution);

  if (resolved.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('admin.moderation.reportList.unresolvedBadge', {
          defaultValue: 'Not resolved',
        })}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {resolved.map((report) => (
        <li
          key={report.id}
          className="flex items-center justify-between rounded-md border p-3"
        >
          <div className="flex items-center gap-3">
            <Avatar profile={report.reportedProfile} size={2} />
            <div>
              <p className="font-medium">
                {report.reportedProfile.displayName ||
                  `@${report.reportedProfile.handle}`}
              </p>
              <p className="text-muted-foreground text-xs">
                <UpdatingDate date={report.createdAt} /> · {report.resolution}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/admin/moderation/reports/@${report.reportedProfile.handle}`}
              className="text-primary text-xs hover:underline"
            >
              {t('admin.moderation.reportList.seeReports', {
                defaultValue: 'See reports',
              })}
            </Link>
            <Button
              title={t('admin.moderation.reopen', { defaultValue: 'Reopen' })}
              variant="ghost"
              action={() => reopenReport({ reportId: report.id })}
            >
              {t('admin.moderation.reopen', { defaultValue: 'Reopen' })}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm ${active ? 'border-primary border-b-2 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}
