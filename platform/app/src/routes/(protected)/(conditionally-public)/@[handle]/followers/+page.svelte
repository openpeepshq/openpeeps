<script lang="ts">
  import { page } from '$app/stores';
  import { profileByHandleStore } from '@openpeeps/svelte/api';
  import type { PublicProfile } from '@openpeeps/common/types';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { AccessDeniedLoader, ProfileFollowers } from '@openpeeps/svelte/components';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const handle = $page.params.handle;
  const profileQuery = profileByHandleStore(handle);
  const { t } = i18nContext();

  const pageHeaderStore = getPageHeaderStore();

  let profile: PublicProfile | undefined = $derived($profileQuery.data);

  $effect(() => {
    pageHeaderStore.set({
      title: `${t('profile.followers.pageTitle')} ${profile?.displayName ?? '@'+handle}`,
    });
  });
</script>

<div class="relative">
  <AccessDeniedLoader queries={[$profileQuery]}>
    <ProfileFollowers {profile} />
  </AccessDeniedLoader>
</div>
