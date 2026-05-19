<script lang="ts">
  import { EmailDiagnostics } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const { t } = i18nContext();

  getPageHeaderStore().set({
    title: t('diagnostics.email.title'),
  });
</script>

<div class="p-4">
  <EmailDiagnostics />
</div>
