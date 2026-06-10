import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useT, useOpenpeeps } from '@openpeeps/react';
import {
  Avatar,
  PostMarkdown,
  UpdatingDate,
} from '@openpeeps/react/components';
import { Button } from '@openpeeps/react-ui';
import { routeHandleParam } from '../../lib/routeHandles';

export function AdminReports() {
  const t = useT();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const { openpeepsApi } = useOpenpeeps();
  const profileQuery = openpeepsApi.useProfileByHandle(handle);
  const reportsQuery = openpeepsApi.admin.useReportsList();
  const reopen = openpeepsApi.admin.reopenReportAction();

  const [tab, setTab] = useState<'post' | 'profile'>('post');
  const [filter, setFilter] = useState<'all' | 'resolved' | 'not-resolved'>(
    'not-resolved',
  );

  const profile = profileQuery.data;
  const reports = useMemo(() => {
    const all = reportsQuery.data ?? [];
    return all
      .filter((r) => r.reportedProfile.handle === handle)
      .filter((r) =>
        tab === 'profile'
          ? r.reportedPosts.length === 0
          : r.reportedPosts.length > 0,
      )
      .filter((r) => {
        if (filter === 'resolved') return !!r.resolution;
        if (filter === 'not-resolved') return !r.resolution;
        return true;
      });
  }, [reportsQuery.data, handle, tab, filter]);

  if (profileQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-2xl">
        {t('profiles.notFound', { defaultValue: 'Profile not found' })}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center gap-3">
        <Avatar profile={profile} size={3} />
        <div>
          <h1 className="text-xl font-semibold">
            {profile.displayName || `@${profile.handle}`}
          </h1>
          <p className="text-muted-foreground text-sm">@{profile.handle}</p>
        </div>
      </header>

      <nav className="border-border flex border-b">
        <TabButton active={tab === 'post'} onClick={() => setTab('post')}>
          Post reports
        </TabButton>
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')}>
          Profile reports
        </TabButton>
      </nav>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Filter:</span>
        {(['all', 'not-resolved', 'resolved'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded px-2 py-1 ${filter === value ? 'bg-primary text-primary-foreground' : 'bg-surface-100 hover:bg-surface-200'}`}
          >
            {value}
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <p className="text-muted-foreground text-sm">No reports.</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id} className="space-y-1 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  <UpdatingDate date={report.createdAt} /> · @
                  {report.reporterProfile.handle} reported
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${report.resolution ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}
                >
                  {report.resolution ? 'Resolved' : 'Open'}
                </span>
              </div>
              <p className="text-sm">{report.comment}</p>
              {report.reportedPosts.length > 0 && (
                <details className="text-xs">
                  <summary className="text-muted-foreground cursor-pointer">
                    {report.reportedPosts.length} reported post
                    {report.reportedPosts.length === 1 ? '' : 's'}
                  </summary>
                  <ul className="space-y-1 pl-3">
                    {report.reportedPosts.map((post) => (
                      <li key={post.id} className="bg-surface-100 rounded p-2">
                        <PostMarkdown
                          source={
                            (post.data as { content?: string })?.content ?? ''
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {report.resolution && (
                <Button
                  title="Reopen"
                  variant="variant-ghost-primary"
                  action={() => reopen({ reportId: report.id })}
                >
                  Reopen
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
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
