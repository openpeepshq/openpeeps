import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { UpdatingDate } from '@openpeeps/react/components';
import { Button } from '@openpeeps/react-ui';

export function AdminModeration() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const reportsQuery = openpeepsApi.admin.useReportsList();
  const reopenReport = openpeepsApi.admin.reopenReportAction();

  useSetPageHeader(
    t('admin.moderation.title', { defaultValue: 'Moderation queue' }),
  );

  const reports = reportsQuery.data ?? [];
  const isResolved = (r: (typeof reports)[number]) => !!r.resolution;

  return (
    <div className="p-4">
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-surface-100">
            <tr>
              <th className="p-2 text-left">Reporter</th>
              <th className="p-2 text-left">Reported</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Posts</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-t">
                <td className="p-2">
                  @{report.reporterProfile.handle}
                </td>
                <td className="p-2">
                  @{report.reportedProfile.handle}
                </td>
                <td className="p-2 text-xs">{report.category ?? '—'}</td>
                <td className="p-2 text-xs">
                  {report.reportedPosts.length}
                </td>
                <td className="p-2 text-xs">
                  <span
                    className={`rounded px-2 py-0.5 ${isResolved(report) ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}
                  >
                    {isResolved(report) ? 'Resolved' : 'Open'}
                  </span>
                </td>
                <td className="p-2 text-xs">
                  <UpdatingDate date={report.createdAt} />
                </td>
                <td className="p-2">
                  {isResolved(report) && (
                    <Button
                      title="Reopen"
                      variant="variant-ghost-primary"
                      action={() =>
                        reopenReport({ reportId: report.id })
                      }
                    >
                      Reopen
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
