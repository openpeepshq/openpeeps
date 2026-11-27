import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type {
  AuditLogCursor,
  AuditLogEntry,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Button, Toast } from '@openpeepshq/react-ui';
import { formatDateTime } from '../../lib/datetime';
import { apiErrorMessage } from '../../lib/apiErrorMessage';

const PAGE_SIZE = 100;

export function AdminAuditLog() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();

  const [actorFilter, setActorFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [targetIdFilter, setTargetIdFilter] = useState('');
  const [cursor, setCursor] = useState<AuditLogCursor | undefined>(undefined);
  const [exportError, setExportError] = useState<string | null>(null);

  const filterParams = useMemo(
    () => ({
      actor: actorFilter.trim() || undefined,
      targetType: targetTypeFilter.trim() || undefined,
      targetId: targetIdFilter.trim() || undefined,
    }),
    [actorFilter, targetTypeFilter, targetIdFilter],
  );

  const queryParams = useMemo(
    () => ({
      before: cursor?.before,
      beforeId: cursor?.beforeId,
      limit: PAGE_SIZE,
      ...filterParams,
    }),
    [cursor, filterParams],
  );

  const listQuery = openpeepsApi.admin.useAuditLogList(queryParams);
  const profilesQuery = openpeepsApi.admin.useProfilesList();
  const exportAction = openpeepsApi.admin.auditLogExport;

  useSetPageHeader(
    t('admin.auditLog.title', { defaultValue: 'Audit Log' }),
    <Button
      variant="secondary"
      size="sm"
      title={t('admin.auditLog.exportJson')}
      action={() =>
        void exportAction(filterParams).then((result) => {
          if ('error' in result) {
            setExportError(apiErrorMessage(result.error, t));
            return;
          }
          setExportError(null);
          const { filename, content, contentType, encoding } = result.data;
          const blob =
            encoding === 'base64'
              ? new Blob(
                  [Uint8Array.from(atob(content), (c) => c.charCodeAt(0))],
                  { type: contentType },
                )
              : new Blob([content], { type: contentType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        })
      }
    >
      {t('admin.auditLog.exportJson', { defaultValue: 'Export JSON' })}
    </Button>,
  );

  const profileById = useMemo(() => {
    const map = new Map<string, ProfileWithMeta>();
    for (const p of profilesQuery.data ?? []) {
      map.set(p.id, p);
    }
    return map;
  }, [profilesQuery.data]);

  const actionType = (action: string) => action.split('.')[0];

  const targetTypes = useMemo(() => {
    const set = new Set<string>();
    for (const entry of listQuery.data?.entries ?? []) {
      set.add(entry.targetType);
    }
    return Array.from(set).sort();
  }, [listQuery.data]);

  const onFilterChange =
    (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      setCursor(undefined);
    };

  const isLoading = listQuery.isPending;
  const entries = listQuery.data?.entries ?? [];

  return (
    <div className="space-y-4 p-4">
      <div className="bg-surface-2 rounded-lg p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium">
              {t('admin.auditLog.title', { defaultValue: 'Audit Log' })}
            </p>
            <p className="text-sm opacity-80">
              {t('admin.auditLog.hint', {
                defaultValue:
                  'A record of administrative actions taken on this instance.',
              })}
            </p>
          </div>
          <Button
            variant="secondary"
            title={t('common.actions.refresh')}
            action={() => listQuery.refetch()}
          >
            {t('common.actions.refresh')}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label>
            <span>{t('admin.auditLog.filterActor')}</span>
            <input
              type="search"
              value={actorFilter}
              onChange={onFilterChange(setActorFilter)}
              className="op-input rounded"
              placeholder={t('admin.auditLog.filterActorPlaceholder')}
            />
          </label>
          <label>
            <span>{t('admin.auditLog.filterTargetType')}</span>
            <input
              type="search"
              value={targetTypeFilter}
              onChange={onFilterChange(setTargetTypeFilter)}
              className="op-input rounded"
              placeholder={
                targetTypes.join(', ') ||
                t('admin.auditLog.filterTargetTypePlaceholder')
              }
            />
          </label>
          <label>
            <span>{t('admin.auditLog.filterTargetId')}</span>
            <input
              type="search"
              value={targetIdFilter}
              onChange={onFilterChange(setTargetIdFilter)}
              className="op-input rounded"
              placeholder={t('admin.auditLog.filterTargetIdPlaceholder')}
            />
          </label>
        </div>
      </div>

      <div className="border-border bg-surface overflow-hidden rounded-lg border">
        {isLoading ? (
          <p className="p-4 text-sm opacity-70">{t('common.states.loading')}</p>
        ) : listQuery.isError ? (
          <p className="text-error p-4 text-sm">
            {t('admin.auditLog.loadError', {
              defaultValue: 'Failed to load the audit log.',
            })}
          </p>
        ) : entries.length === 0 ? (
          <p className="p-4 text-sm opacity-70">
            {t('admin.auditLog.empty', {
              defaultValue: 'No audit entries match the current filters.',
            })}
          </p>
        ) : (
          <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 sticky top-0 z-10 text-left">
                <tr>
                  <th className="w-40 px-3 py-2 font-medium">
                    {t('admin.auditLog.columnTime')}
                  </th>
                  <th className="w-40 px-3 py-2 font-medium">
                    {t('admin.auditLog.columnActor')}
                  </th>
                  <th className="w-44 px-3 py-2 font-medium">
                    {t('admin.auditLog.columnAction')}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t('admin.auditLog.columnTarget')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry: AuditLogEntry) => {
                  const actor = profileById.get(entry.actorProfileId);
                  const actorLabel =
                    actor?.handle ??
                    (entry.actorAccountId
                      ? t('admin.auditLog.actorDeleted', {
                          defaultValue: 'deleted account',
                        })
                      : '—');
                  return (
                    <tr
                      key={entry.id}
                      className="border-border border-t align-top"
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs opacity-80">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="break-all px-3 py-2">
                        {actorLabel}
                        {entry.actorIp ? (
                          <span className="block font-mono text-xs opacity-60">
                            {entry.actorIp}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className="inline-block rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary"
                          title={actionType(entry.action)}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td className="break-all px-3 py-2">
                        <span className="font-medium">{entry.targetType}</span>
                        <span className="opacity-60">
                          {' '}
                          {entry.targetLabel || entry.targetId || '—'}
                        </span>
                        {entry.metadata ? (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs opacity-60">
                              {t('admin.auditLog.details', {
                                defaultValue: 'Details',
                              })}
                            </summary>
                            <pre className="mt-1 overflow-x-auto rounded bg-black/5 p-2 font-mono text-xs">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {entries.length === PAGE_SIZE ? (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            action={() => {
              const last = entries[entries.length - 1];
              if (last)
                setCursor({ before: last.createdAt, beforeId: last.id });
            }}
          >
            {t('admin.auditLog.loadOlder', {
              defaultValue: 'Load older entries',
            })}
          </Button>
        </div>
      ) : null}
      {exportError ? (
        <Toast variant="error" onDismiss={() => setExportError(null)}>
          {exportError}
        </Toast>
      ) : null}
    </div>
  );
}
