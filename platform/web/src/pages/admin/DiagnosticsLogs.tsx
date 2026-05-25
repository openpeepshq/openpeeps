import { useMemo, useState } from 'react';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Input, Label } from '@openpeeps/react-ui';

const LEVEL_COLORS: Record<string, string> = {
  error: 'text-error',
  warn: 'text-warning',
  info: 'text-foreground',
  debug: 'text-muted-foreground',
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminDiagnosticsLogs() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const [date, setDate] = useState(todayIsoDate());
  const [filter, setFilter] = useState('');
  const logsQuery = openpeepsApi.admin.useLogsList(date);

  useSetPageHeader(
    t('diagnostics.logs.title', { defaultValue: 'Server logs' }),
  );

  const logs = logsQuery.data ?? [];
  const filtered = useMemo(
    () =>
      filter
        ? logs.filter(
            (log) =>
              log.message.toLowerCase().includes(filter.toLowerCase()) ||
              log.namespace.toLowerCase().includes(filter.toLowerCase()) ||
              log.level.toLowerCase().includes(filter.toLowerCase()),
          )
        : logs,
    [filter, logs],
  );

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="log-date">Date</Label>
          <Input
            id="log-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="log-filter">Filter</Label>
          <Input
            id="log-filter"
            placeholder={t('common.filter', { defaultValue: 'Filter…' })}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      <ul className="space-y-0.5 rounded-md border bg-surface-100 p-2 font-mono text-xs">
        {filtered.map((log, idx) => (
          <li key={idx} className="flex items-start gap-2 py-0.5">
            <span className="w-20 text-muted-foreground">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span className={`w-12 uppercase ${LEVEL_COLORS[log.level] ?? ''}`}>
              {log.level}
            </span>
            <span className="w-24 text-muted-foreground">{log.namespace}</span>
            <span className="flex-1 whitespace-pre-wrap break-all">{log.message}</span>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="p-2 text-muted-foreground">No logs to display.</li>
        ) : null}
      </ul>
    </div>
  );
}
