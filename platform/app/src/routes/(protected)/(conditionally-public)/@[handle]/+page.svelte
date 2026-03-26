<script lang="ts">
  import { page } from '$app/state';
  import { profileByHandleStore } from '@openpeeps/svelte/api';
  import { Rss, UserX } from 'lucide-svelte';

  import type { ProfileWithMeta } from '@openpeeps/common/types';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { AccessDeniedLoader, ProfileHeader } from '@openpeeps/svelte/components';
  import { ProfilePostsAndReplies } from '@openpeeps/svelte/components';
  import { me } from '@openpeeps/svelte/api';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  let handle = $derived(page.params.handle);

  let profileQuery = $derived(profileByHandleStore(handle));

  let profileData = $derived($profileQuery.data as ProfileWithMeta);

  const pageHeaderStore = getPageHeaderStore();
  const { t } = i18nContext();


  $effect(() => {
    pageHeaderStore.set({
      title: profileData?.displayName || `@${handle}`,
    });
  });
</script>

<AccessDeniedLoader queries={[$profileQuery]}>
  {#if handle === $me?.handle}
    <ProfileHeader profile={$me} isCurrentProfile={true} />
    <ProfilePostsAndReplies profile={$me} />
  {:else if handle === profileData?.handle}
    <ProfileHeader profile={profileData} isCurrentProfile={false} />
    <ProfilePostsAndReplies profile={profileData} />
  {/if}
  {#snippet error()}
    <div class="relative pt-20 flex flex-col items-center">
      <Rss size={60} />
      <p class="mt-2">{t('profile.notFound.title')}</p>
      <p class="mt-2">
        {t('profile.notFound.description')}
      </p>
    </div>
  {/snippet}
</AccessDeniedLoader>
