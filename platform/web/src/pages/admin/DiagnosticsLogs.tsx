import { useMemo, useState } from 'react';
import type { LogRow } from '@openpeeps/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Button } from '@openpeeps/react-ui';

const LOG_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const levelClass = (level: string) => {
  switch (level.toLowerCase()) {
    case 'error':
    case 'fatal':
      return 'bg-error/15 text-error';
    case 'warn':
      return 'bg-warning/15 text-warning';
    case 'debug':
    case 'trace':
      return 'bg-surface-300 text-muted-foreground';
    default:
      return 'bg-primary/10 text-primary';
  }
};

const formatTimestamp = (timestamp: string) => {
  try {
    return new Date(timestamp).toISOString().slice(11, 23);
  } catch {
    return timestamp;
  }
};

export function AdminDiagnosticsLogs() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const [date, setDate] = useState(todayIsoDate());
  const [textFilter, setTextFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | LogLevel>('all');

  const isToday = date === todayIsoDate();
  const logsQuery = openpeepsApi.admin.useLogsList(
    date,
    isToday ? 5000 : undefined,
  );

  useSetPageHeader(t('diagnostics.logs.title', { defaultValue: 'Logs' }));

  const logs = logsQuery.data ?? [];
  const filtered = useMemo(() => {
    const needle = textFilter.trim().toLowerCase();
    return logs.filter((log: LogRow) => {
      if (levelFilter !== 'all' && log.level.toLowerCase() !== levelFilter) {
        return false;
      }
      if (!needle) return true;
      return (
        log.message.toLowerCase().includes(needle) ||
        log.namespace.toLowerCase().includes(needle)
      );
    });
  }, [logs, textFilter, levelFilter]);

  return (
    <div className="space-y-4 p-4">
      <div className="bg-surface-200 rounded-lg p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium">{t('diagnostics.logs.title')}</p>
            <p className="text-sm opacity-80">{t('diagnostics.logs.hint')}</p>
          </div>
          <Button
            variant="variant-filled-surface"
            title={t('diagnostics.logs.refresh')}
            action={() => logsQuery.refetch()}
          >
            {t('diagnostics.logs.refresh')}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label>
            <span>{t('diagnostics.logs.date')}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="op-input rounded"
              max={todayIsoDate()}
            />
          </label>

          <label>
            <span>{t('diagnostics.logs.level')}</span>
            <select
              value={levelFilter}
              onChange={(e) =>
                setLevelFilter(e.target.value as 'all' | LogLevel)
              }
              className="op-input rounded"
            >
              <option value="all">{t('diagnostics.logs.allLevels')}</option>
              {LOG_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t('diagnostics.logs.filter')}</span>
            <input
              type="search"
              value={textFilter}
              onChange={(e) => setTextFilter(e.target.value)}
              className="op-input rounded"
              placeholder={t('diagnostics.logs.filterPlaceholder')}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-80">
          <span>
            {t('diagnostics.logs.showing', {
              count: filtered.length,
              total: logs.length,
            })}
          </span>
          {isToday ? (
            <span className="text-primary">
              {t('diagnostics.logs.autoRefresh')}
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-surface-300 bg-surface-100 overflow-hidden rounded-lg border">
        {logsQuery.isPending ? (
          <p className="p-4 text-sm opacity-70">{t('common.form.loading')}</p>
        ) : logsQuery.isError ? (
          <p className="text-error p-4 text-sm">
            {t('diagnostics.logs.loadError')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm opacity-70">
            {t('diagnostics.logs.empty')}
          </p>
        ) : (
          <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-surface-200 sticky top-0 z-10 text-left">
                <tr>
                  <th className="w-28 px-3 py-2 font-medium">
                    {t('diagnostics.logs.timestamp')}
                  </th>
                  <th className="w-20 px-3 py-2 font-medium">
                    {t('diagnostics.logs.levelColumn')}
                  </th>
                  <th className="w-44 px-3 py-2 font-medium">
                    {t('diagnostics.logs.namespaceColumn')}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t('diagnostics.logs.messageColumn')}
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {filtered.map((log, idx) => (
                  <tr
                    key={`${log.timestamp}-${log.namespace}-${idx}`}
                    className="border-surface-300 border-t align-top"
                  >
                    <td className="px-3 py-2 text-xs opacity-80">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold uppercase ${levelClass(log.level)}`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="break-all px-3 py-2 text-xs opacity-90">
                      {log.namespace}
                    </td>
                    <td className="whitespace-pre-wrap break-words px-3 py-2">
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
