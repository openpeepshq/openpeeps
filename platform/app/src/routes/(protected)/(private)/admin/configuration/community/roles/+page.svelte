<script lang="ts">
  import {
    AccessDeniedLoader,
    ConfigCommunityDefaultRoles,
    i18nContext,
    ConfigCommunityRolesSimple,
  } from '@openpeeps/svelte/components';
  import { configStore, getRolesListStore } from '@openpeeps/svelte/api';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';

  const communityConfig = configStore('allpeep', 'community');
  const rolesList = getRolesListStore();

  const { t } = i18nContext();

  const pageHeaderStore = getPageHeaderStore();

  pageHeaderStore.set({
    title: t('admin.configuration.community.capabilities.title'),
  });
</script>

<AccessDeniedLoader queries={[$communityConfig, $rolesList]}>
  <div class="flex flex-col gap-4">
    <ConfigCommunityDefaultRoles
      communityConfig={$communityConfig.data!.config}
    />
    <ConfigCommunityRolesSimple roles={$rolesList.data!} />
  </div>
</AccessDeniedLoader>
