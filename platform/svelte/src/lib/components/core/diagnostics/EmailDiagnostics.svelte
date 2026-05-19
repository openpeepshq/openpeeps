<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import {
    emailQueueStatsStore,
    queueTestEmailMutation,
  } from '$lib/api/admin/email';
  import { client } from '$lib/api/helpers';
  import { getQueryClientContext } from '@tanstack/svelte-query';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { toast } from '$lib/utils/toast';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();
  const toastStore = getToastStore();

  const statsQuery = emailQueueStatsStore();
  const queueTest = queueTestEmailMutation();
  const queryClient = getQueryClientContext();

  let testRecipient = $state('');
  let queuing = $state(false);

  const refreshStats = () =>
    queryClient.invalidateQueries({
      queryKey: client.admin.diagnostics.email.queueStats.queryKey({}),
    });

  const handleQueueTest = async () => {
    const trimmed = testRecipient.trim();
    if (!trimmed) {
      toastStore.trigger(
        toast({
          message: t('diagnostics.email.recipientRequired'),
          background: 'variant-filled-warning',
          autohide: true,
        }),
      );
      return;
    }
    queuing = true;
    try {
      await queueTest({ to: trimmed });
      toastStore.trigger(
        toast({
          message: t('diagnostics.email.queueSuccess'),
          background: 'variant-filled-success',
          autohide: true,
        }),
      );
      await refreshStats();
    } catch (e: unknown) {
      const detail =
        e &&
        typeof e === 'object' &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : '';
      toastStore.trigger(
        toast({
          message: detail
            ? `${t('diagnostics.email.queueFailed')}: ${detail}`
            : t('diagnostics.email.queueFailed'),
          background: 'variant-filled-error',
          autohide: false,
        }),
      );
    } finally {
      queuing = false;
    }
  };
</script>

<div class="space-y-6">
  <div class="rounded-lg bg-surface-200-700-token p-4">
    <p class="font-medium">{t('diagnostics.email.testTitle')}</p>
    <p class="mb-3 text-sm opacity-80">
      {t('diagnostics.email.testHint')}
    </p>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label class="label flex-1">
        <span>{t('diagnostics.email.testRecipient')}</span>
        <input
          type="email"
          bind:value={testRecipient}
          class="input rounded"
          placeholder={t('diagnostics.email.testRecipientPlaceholder')}
          autocomplete="email"
        />
      </label>
      <Button
        variant="variant-filled-secondary"
        title={t('diagnostics.email.queueTest')}
        action={handleQueueTest}
        disabled={queuing}
      >
        {queuing
          ? t('common.form.loading')
          : t('diagnostics.email.queueTest')}
      </Button>
    </div>
  </div>

  <div class="rounded-lg bg-surface-200-700-token p-4">
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <p class="font-medium">{t('diagnostics.email.queueTitle')}</p>
      <Button
        variant="variant-filled-surface"
        title={t('diagnostics.email.refresh')}
        action={refreshStats}
      >
        {t('diagnostics.email.refresh')}
      </Button>
    </div>
    <p class="mb-3 text-sm opacity-80">
      {t('diagnostics.email.countsHint')}
    </p>

    {#if $statsQuery.isPending}
      <p class="text-sm opacity-70">{t('common.form.loading')}</p>
    {:else if $statsQuery.isError}
      <p class="text-sm text-error-500">
        {t('diagnostics.email.statsError')}
      </p>
    {:else if $statsQuery.data}
      {@const c = $statsQuery.data.counts}
      <dl
        class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 md:grid-cols-6"
      >
        <div>
          <dt class="opacity-70">{t('diagnostics.email.waiting')}</dt>
          <dd class="font-mono">{c.waiting}</dd>
        </div>
        <div>
          <dt class="opacity-70">{t('diagnostics.email.active')}</dt>
          <dd class="font-mono">{c.active}</dd>
        </div>
        <div>
          <dt class="opacity-70">{t('diagnostics.email.completed')}</dt>
          <dd class="font-mono">{c.completed}</dd>
        </div>
        <div>
          <dt class="opacity-70">{t('diagnostics.email.failed')}</dt>
          <dd class="font-mono text-error-500">{c.failed}</dd>
        </div>
        <div>
          <dt class="opacity-70">{t('diagnostics.email.delayed')}</dt>
          <dd class="font-mono">{c.delayed}</dd>
        </div>
        <div>
          <dt class="opacity-70">{t('diagnostics.email.prioritized')}</dt>
          <dd class="font-mono">{c.prioritized}</dd>
        </div>
      </dl>

      {#if $statsQuery.data.recentFailures.length > 0}
        <div class="mt-4 border-t border-surface-300-600-token pt-3">
          <p class="mb-2 font-medium text-error-600 dark:text-error-400">
            {t('diagnostics.email.recentFailures')}
          </p>
          <ul class="space-y-2 text-sm">
            {#each $statsQuery.data.recentFailures as f}
              <li
                class="rounded border border-error-500/30 bg-error-500/10 p-2"
              >
                <span class="font-mono text-xs opacity-80">{f.name}</span>
                <p class="whitespace-pre-wrap break-words">{f.failedReason}</p>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    {/if}

    <p class="mt-4 text-xs opacity-70">
      {t('diagnostics.email.bounceNote')}
    </p>
  </div>
</div>
