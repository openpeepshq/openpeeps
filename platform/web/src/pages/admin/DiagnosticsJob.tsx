import { useParams } from 'react-router-dom';
import type { AdminJobDetail } from '@openpeeps/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Button } from '@openpeeps/react-ui';

function formatTime(ms: number | null) {
  if (ms == null) return '—';
  const iso = new Date(ms).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

function formatPayload(data: unknown) {
  if (data == null) return '—';
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function JobDetails({
  job,
  onRefresh,
}: {
  job: AdminJobDetail;
  onRefresh: () => void;
}) {
  const t = useT();

  return (
    <div className="space-y-4 p-4">
      <div className="bg-surface-100 rounded-lg border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">
            {t('diagnostics.jobs.details', { defaultValue: 'Job details' })}
          </p>
          <Button variant="default" action={onRefresh}>
            {t('diagnostics.jobs.refresh', { defaultValue: 'Refresh' })}
          </Button>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="opacity-70">
              {t('diagnostics.jobs.queue', { defaultValue: 'Queue' })}
            </dt>
            <dd className="font-mono">{job.queue}</dd>
          </div>
          <div>
            <dt className="opacity-70">
              {t('diagnostics.jobs.id', { defaultValue: 'ID' })}
            </dt>
            <dd className="break-all font-mono">{job.id}</dd>
          </div>
          <div>
            <dt className="opacity-70">
              {t('diagnostics.jobs.name', { defaultValue: 'Name' })}
            </dt>
            <dd className="break-all font-mono">{job.name}</dd>
          </div>
          <div>
            <dt className="opacity-70">
              {t('diagnostics.jobs.state', { defaultValue: 'State' })}
            </dt>
            <dd className="font-mono">{job.state}</dd>
          </div>
          <div>
            <dt className="opacity-70">
              {t('diagnostics.jobs.queuedAt', { defaultValue: 'Queued at' })}
            </dt>
            <dd>{formatTime(job.timestamp)}</dd>
          </div>
          <div>
            <dt className="opacity-70">
              {t('diagnostics.jobs.finishedAt', {
                defaultValue: 'Finished at',
              })}
            </dt>
            <dd>{formatTime(job.finishedOn)}</dd>
          </div>
        </dl>
        {job.failedReason ? (
          <div className="border-error/30 bg-error/10 mt-3 rounded border p-2 text-sm">
            <p className="text-error mb-1 font-medium">
              {t('diagnostics.jobs.failedReason', {
                defaultValue: 'Failed reason',
              })}
            </p>
            <p className="whitespace-pre-wrap break-words">
              {job.failedReason}
            </p>
          </div>
        ) : null}
        <div className="mt-3">
          <p className="mb-1 text-sm opacity-70">
            {t('diagnostics.jobs.payload', { defaultValue: 'Payload' })}
          </p>
          <pre className="bg-surface-200 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded p-2 font-mono text-xs">
            {formatPayload(job.data)}
          </pre>
        </div>
      </div>

      <div className="bg-surface-100 rounded-lg border p-4">
        <p className="mb-2 font-medium">
          {t('diagnostics.jobs.logs', { defaultValue: 'Logs' })}
        </p>
        <p className="mb-3 text-sm opacity-80">
          {t('diagnostics.jobs.logsHint', {
            defaultValue: '{{count}} log lines',
            count: job.logCount,
          })}
        </p>
        {job.logs.length === 0 ? (
          <p className="text-sm opacity-70">
            {t('diagnostics.jobs.logsEmpty', {
              defaultValue: 'No logs recorded.',
            })}
          </p>
        ) : (
          <ol className="space-y-1 font-mono text-xs">
            {job.logs.map((line, index) => (
              <li
                key={index}
                className="bg-surface-200 whitespace-pre-wrap break-words rounded px-2 py-1"
              >
                <span className="mr-2 opacity-50">{index + 1}.</span>
                {line}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export function AdminDiagnosticsJob() {
  const t = useT();
  const { queue, jobId } = useParams<{ queue: string; jobId: string }>();
  const { openpeepsApi } = useOpenpeeps();

  const jobQuery = openpeepsApi.admin.useJobDetail(queue ?? '', jobId ?? '');

  useSetPageHeader(t('diagnostics.jobs.title', { defaultValue: 'Queue job' }));

  if (!queue || !jobId) {
    return (
      <p className="text-error p-4 text-sm">
        {t('diagnostics.jobs.notFound', { defaultValue: 'Job not found.' })}
      </p>
    );
  }

  const refresh = () => jobQuery.refetch();

  if (jobQuery.isLoading) {
    return (
      <p className="p-4 text-sm opacity-70">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </p>
    );
  }

  if (jobQuery.isError || !jobQuery.data) {
    return (
      <p className="text-error p-4 text-sm">
        {t('diagnostics.jobs.notFound', { defaultValue: 'Job not found.' })}
      </p>
    );
  }

  return <JobDetails job={jobQuery.data} onRefresh={refresh} />;
}
