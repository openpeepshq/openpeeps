<script lang="ts">
  import { AccessTokensTab, i18nContext } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';

  const pageHeaderStore = getPageHeaderStore();
  const { t } = i18nContext();

  $effect(() => {
    pageHeaderStore.set({
      title: t('settings.accessTokens.title'),
    });
  });
</script>

<AccessTokensTab />
