<script lang="ts">
  import { ConfigMenuButton } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const { t } = i18nContext();

  getPageHeaderStore().set({
    title: t('diagnostics.title'),
  });
</script>

<div class="p-4">
  <ConfigMenuButton
    translationPrefix="diagnostics.email"
    action="/admin/diagnostics/email"
  ></ConfigMenuButton>
</div>
