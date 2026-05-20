<script lang="ts">
  import type { LogRow } from '@openpeeps/common/types';
  import { Button } from '@openpeeps/ui';
  import { format } from 'date-fns/format';
  import { parseISO } from 'date-fns/parseISO';
  import { getQueryClientContext } from '@tanstack/svelte-query';
  import { adminLogsStore } from '$lib/api/admin/logs';
  import { client } from '$lib/api/helpers';
  import { AccessDeniedLoader } from '$lib/components/layout';
  import { i18nContext } from '$lib/components/i18n';
  import { writable } from 'svelte/store';

  const { t } = i18nContext();
  const queryClient = getQueryClientContext();

  const logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
  type LogLevel = (typeof logLevels)[number];

  const selectedDateStore = writable(format(new Date(), 'yyyy-MM-dd'));
  let textFilter = $state('');
  let levelFilter = $state<'all' | LogLevel>('all');

  const logsQuery = adminLogsStore(selectedDateStore);

  const isToday = $derived($selectedDateStore === format(new Date(), 'yyyy-MM-dd'));

  const filteredLogs = $derived.by(() => {
    const logs = $logsQuery.data ?? [];
    const needle = textFilter.trim().toLowerCase();

    return logs.filter((log: LogRow) => {
      if (levelFilter !== 'all' && log.level.toLowerCase() !== levelFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return (
        log.message.toLowerCase().includes(needle) ||
        log.namespace.toLowerCase().includes(needle)
      );
    });
  });

  const levelClass = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
      case 'fatal':
        return 'bg-error-500/15 text-error-700 dark:text-error-300';
      case 'warn':
        return 'bg-warning-500/15 text-warning-700 dark:text-warning-300';
      case 'debug':
      case 'trace':
        return 'bg-surface-300-600-token text-surface-600-300-token';
      default:
        return 'bg-primary-500/10 text-primary-700 dark:text-primary-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return parseISO(timestamp).toISOString().slice(11, 23);
    } catch {
      return timestamp;
    }
  };

  const refreshLogs = () =>
    queryClient.invalidateQueries({
      queryKey: client.admin.logs.list.queryKey({
        queryParameters: { date: $selectedDateStore },
      }),
    });
</script>

<AccessDeniedLoader queries={[$logsQuery]}>
<div class="space-y-4">
  <div class="rounded-lg bg-surface-200-700-token p-4">
    <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="font-medium">{t('diagnostics.logs.title')}</p>
        <p class="text-sm opacity-80">{t('diagnostics.logs.hint')}</p>
      </div>
      <Button
        variant="variant-filled-surface"
        title={t('diagnostics.logs.refresh')}
        action={refreshLogs}
      >
        {t('diagnostics.logs.refresh')}
      </Button>
    </div>

    <div class="grid gap-3 md:grid-cols-3">
      <label class="label">
        <span>{t('diagnostics.logs.date')}</span>
        <input
          type="date"
          bind:value={$selectedDateStore}
          class="input rounded"
          max={format(new Date(), 'yyyy-MM-dd')}
        />
      </label>

      <label class="label">
        <span>{t('diagnostics.logs.level')}</span>
        <select bind:value={levelFilter} class="select rounded">
          <option value="all">{t('diagnostics.logs.allLevels')}</option>
          {#each logLevels as level}
            <option value={level}>{level.toUpperCase()}</option>
          {/each}
        </select>
      </label>

      <label class="label md:col-span-1">
        <span>{t('diagnostics.logs.filter')}</span>
        <input
          type="search"
          bind:value={textFilter}
          class="input rounded"
          placeholder={t('diagnostics.logs.filterPlaceholder')}
        />
      </label>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-80">
      <span>
        {t('diagnostics.logs.showing', {
          count: filteredLogs.length,
          total: $logsQuery.data?.length ?? 0,
        })}
      </span>
      {#if isToday}
        <span class="text-primary-600 dark:text-primary-400">
          {t('diagnostics.logs.autoRefresh')}
        </span>
      {/if}
    </div>
  </div>

  <div
    class="overflow-hidden rounded-lg border border-surface-300-600-token bg-surface-100-800-token"
  >
    {#if $logsQuery.isPending}
      <p class="p-4 text-sm opacity-70">{t('common.form.loading')}</p>
    {:else if $logsQuery.isError}
      <p class="p-4 text-sm text-error-500">{t('diagnostics.logs.loadError')}</p>
    {:else if filteredLogs.length === 0}
      <p class="p-4 text-sm opacity-70">{t('diagnostics.logs.empty')}</p>
    {:else}
      <div class="max-h-[calc(100vh-20rem)] overflow-y-auto">
        <table class="w-full table-fixed text-sm">
          <thead class="sticky top-0 z-10 bg-surface-200-700-token text-left">
            <tr>
              <th class="w-28 px-3 py-2 font-medium">
                {t('diagnostics.logs.timestamp')}
              </th>
              <th class="w-20 px-3 py-2 font-medium">
                {t('diagnostics.logs.levelColumn')}
              </th>
              <th class="w-44 px-3 py-2 font-medium">
                {t('diagnostics.logs.namespaceColumn')}
              </th>
              <th class="px-3 py-2 font-medium">
                {t('diagnostics.logs.messageColumn')}
              </th>
            </tr>
          </thead>
          <tbody class="font-mono">
            {#each filteredLogs as log (log.timestamp + log.namespace + log.message)}
              <tr class="border-t border-surface-300-600-token align-top">
                <td class="px-3 py-2 text-xs opacity-80">
                  {formatTimestamp(log.timestamp)}
                </td>
                <td class="px-3 py-2">
                  <span
                    class="inline-block rounded px-1.5 py-0.5 text-xs font-semibold uppercase {levelClass(
                      log.level,
                    )}"
                  >
                    {log.level}
                  </span>
                </td>
                <td class="px-3 py-2 text-xs break-all opacity-90">
                  {log.namespace}
                </td>
                <td class="px-3 py-2 whitespace-pre-wrap break-words">
                  {log.message}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
</AccessDeniedLoader>
