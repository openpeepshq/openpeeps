<script lang="ts">
  import { page } from '$app/state';
  import { JobDiagnostics } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const { t } = i18nContext();
  const queue = $derived(page.params.queue);
  const jobId = $derived(page.params.jobId);

  $effect(() => {
    getPageHeaderStore().set({
      title: t('diagnostics.jobs.title'),
    });
  });
</script>

<div class="p-4">
  <JobDiagnostics {queue} {jobId} />
</div>
