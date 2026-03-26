<script lang="ts">
  import { i18nContext, PublicProfileTab } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { me } from '@openpeeps/svelte/api';

  const pageHeaderStore = getPageHeaderStore();
  const { t } = i18nContext();

  $effect(() => {
    pageHeaderStore.set({
      title: t('settings.publicProfile.title'),
    });
  });
</script>

<PublicProfileTab profile={$me} />
