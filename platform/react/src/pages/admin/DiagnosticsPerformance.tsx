import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Button } from '@openpeepshq/react-ui';

export const AdminDiagnosticsPerformance = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const statsQuery = openpeepsApi.admin.usePerformanceStats();

  useSetPageHeader(
    t('diagnostics.performance.title', { defaultValue: 'Performance' }),
  );

  const stats = statsQuery.data;
  const slowRequests = stats?.slowRequests ?? [];

  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground text-sm">
        {t('diagnostics.performance.description', {
          defaultValue:
            'Recent slow HTTP requests from this process (in-memory ring buffer). Threshold is controlled by PERF_SLOW_REQUEST_MS.',
        })}
      </p>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>
          {t('diagnostics.performance.threshold', {
            defaultValue: 'Slow threshold',
          })}
          : <strong>{stats?.slowRequestMs ?? '—'}ms</strong>
        </span>
        <span>
          {t('diagnostics.performance.dbTiming', {
            defaultValue: 'DB timing',
          })}
          :{' '}
          <strong>
            {stats
              ? stats.dbTimingEnabled
                ? t('diagnostics.performance.on', { defaultValue: 'on' })
                : t('diagnostics.performance.off', { defaultValue: 'off' })
              : '—'}
          </strong>
        </span>
        <Button variant="outline" action={() => void statsQuery.refetch()}>
          {t('diagnostics.performance.refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      {statsQuery.isError ? (
        <p className="text-error text-sm">
          {t('diagnostics.performance.loadError', {
            defaultValue: 'Could not load performance stats.',
          })}
        </p>
      ) : null}

      {slowRequests.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t('diagnostics.performance.empty', {
            defaultValue: 'No slow requests recorded yet.',
          })}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="p-2 font-medium">
                  {t('diagnostics.performance.when', { defaultValue: 'When' })}
                </th>
                <th className="p-2 font-medium">
                  {t('diagnostics.performance.hostname', {
                    defaultValue: 'Hostname',
                  })}
                </th>
                <th className="p-2 font-medium">
                  {t('diagnostics.performance.method', {
                    defaultValue: 'Method',
                  })}
                </th>
                <th className="p-2 font-medium">
                  {t('diagnostics.performance.path', { defaultValue: 'Path' })}
                </th>
                <th className="p-2 font-medium">
                  {t('diagnostics.performance.status', {
                    defaultValue: 'Status',
                  })}
                </th>
                <th className="p-2 font-medium">
                  {t('diagnostics.performance.duration', {
                    defaultValue: 'Duration',
                  })}
                </th>
              </tr>
            </thead>
            <tbody>
              {slowRequests.map((row, index) => (
                <tr key={`${row.at}-${row.path}-${index}`} className="border-t">
                  <td className="text-muted-foreground whitespace-nowrap p-2">
                    {row.at}
                  </td>
                  <td className="text-muted-foreground p-2 font-mono">
                    {row.hostname ?? '—'}
                  </td>
                  <td className="p-2 font-mono">{row.method}</td>
                  <td className="max-w-md truncate p-2 font-mono">
                    {row.path}
                  </td>
                  <td className="p-2">{row.status}</td>
                  <td className="p-2 font-semibold">{row.durationMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
