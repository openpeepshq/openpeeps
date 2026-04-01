<script lang="ts">
  import { i18nContext, NotificationTab } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';

  const pageHeaderStore = getPageHeaderStore();
  const { t } = i18nContext();

  $effect(() => {
    pageHeaderStore.set({
      title: t('settings.notifications.title'),
    });
  });
</script>

<NotificationTab />
