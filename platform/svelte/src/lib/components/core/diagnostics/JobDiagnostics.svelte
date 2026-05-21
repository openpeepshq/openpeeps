<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { jobDetailStore } from '$lib/api/admin/jobs';
  import { client } from '$lib/api/helpers';
  import { getQueryClientContext } from '@tanstack/svelte-query';
  import { AccessDeniedLoader } from '$lib/components/layout';
  import { i18nContext } from '$lib/components/i18n';

  interface Props {
    queue: string;
    jobId: string;
  }

  const { queue, jobId }: Props = $props();

  const formatTime = (ms: number | null) => {
    if (ms == null) return '—';
    const iso = new Date(ms).toISOString();
    return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
  };

  const formatPayload = (data: unknown) => {
    if (data == null) return '—';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const { t } = i18nContext();
  const queryClient = getQueryClientContext();
  const jobQuery = jobDetailStore(queue, jobId);

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: client.admin.diagnostics.jobs.jobDetail.queryKey({
        pathParameters: { queue, jobId },
      }),
    });
</script>

<AccessDeniedLoader queries={[$jobQuery]}>
  <div class="space-y-4">
    {#if $jobQuery.isPending}
      <p class="text-sm opacity-70">{t('common.form.loading')}</p>
    {:else if $jobQuery.isError}
      <p class="text-sm text-error-500">{t('diagnostics.jobs.notFound')}</p>
    {:else if $jobQuery.data}
      {@const job = $jobQuery.data}
      <div class="rounded-lg bg-surface-200-700-token p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p class="font-medium">{t('diagnostics.jobs.details')}</p>
          <Button
            variant="variant-filled-surface"
            title={t('diagnostics.jobs.refresh')}
            action={refresh}
          >
            {t('diagnostics.jobs.refresh')}
          </Button>
        </div>
        <dl class="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt class="opacity-70">{t('diagnostics.jobs.queue')}</dt>
            <dd class="font-mono">{job.queue}</dd>
          </div>
          <div>
            <dt class="opacity-70">{t('diagnostics.jobs.id')}</dt>
            <dd class="font-mono break-all">{job.id}</dd>
          </div>
          <div>
            <dt class="opacity-70">{t('diagnostics.jobs.name')}</dt>
            <dd class="font-mono break-all">{job.name}</dd>
          </div>
          <div>
            <dt class="opacity-70">{t('diagnostics.jobs.state')}</dt>
            <dd class="font-mono">{job.state}</dd>
          </div>
          <div>
            <dt class="opacity-70">{t('diagnostics.jobs.queuedAt')}</dt>
            <dd>{formatTime(job.timestamp)}</dd>
          </div>
          <div>
            <dt class="opacity-70">{t('diagnostics.jobs.finishedAt')}</dt>
            <dd>{formatTime(job.finishedOn)}</dd>
          </div>
        </dl>
        {#if job.failedReason}
          <div class="mt-3 rounded border border-error-500/30 bg-error-500/10 p-2 text-sm">
            <p class="mb-1 font-medium text-error-600 dark:text-error-400">
              {t('diagnostics.jobs.failedReason')}
            </p>
            <p class="whitespace-pre-wrap break-words">{job.failedReason}</p>
          </div>
        {/if}
        <div class="mt-3">
          <p class="mb-1 text-sm opacity-70">{t('diagnostics.jobs.payload')}</p>
          <pre
            class="max-h-64 overflow-auto rounded bg-surface-300-600-token/50 p-2 font-mono text-xs whitespace-pre-wrap break-words"
          >{formatPayload(job.data)}</pre>
        </div>
      </div>

      <div class="rounded-lg bg-surface-200-700-token p-4">
        <p class="mb-2 font-medium">{t('diagnostics.jobs.logs')}</p>
        <p class="mb-3 text-sm opacity-80">
          {t('diagnostics.jobs.logsHint', { count: job.logCount })}
        </p>
        {#if job.logs.length === 0}
          <p class="text-sm opacity-70">{t('diagnostics.jobs.logsEmpty')}</p>
        {:else}
          <ol class="space-y-1 font-mono text-xs">
            {#each job.logs as line, index}
              <li
                class="rounded bg-surface-300-600-token/50 px-2 py-1 whitespace-pre-wrap break-words"
              >
                <span class="mr-2 opacity-50">{index + 1}.</span>{line}
              </li>
            {/each}
          </ol>
        {/if}
      </div>
    {/if}
  </div>
</AccessDeniedLoader>
