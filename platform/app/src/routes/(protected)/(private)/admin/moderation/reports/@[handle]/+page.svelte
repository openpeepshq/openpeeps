<script lang="ts">
  import { page } from '$app/state';
  import { adminReportsStore, profileByHandleStore } from '@openpeeps/svelte/api';
  import type { PublicProfile } from '@openpeeps/common/types';
  import {
    Button,
    getModalManager,
    PopupMenu,
    PopupMenuButton,
  } from '@openpeeps/ui';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import {
    AccessDeniedLoader,
    DeleteReportedProfileModal,
    i18nContext,
    ProfileCard,
    ReportContainer,
  } from '@openpeeps/svelte/components';
  import { profileName, truncateText } from '@openpeeps/common/lib';
  import { Filter } from 'lucide-svelte';
  import { goto } from '$app/navigation';

  const { t } = i18nContext();
  let handle = $derived(page.params.handle);
  let currentTab = $state('post');

  let filterBy = $state('all');
  let profileQuery = $derived(profileByHandleStore(handle));
  const pageHeaderStore = getPageHeaderStore();
  const reportsQuery = adminReportsStore();
  const modalManager = getModalManager();

  let profileData = $derived($profileQuery.data as PublicProfile);
  let profileReports = $derived(
    $reportsQuery.data
      ?.filter((r) => r.reportedProfile.handle === handle)
      .filter((r) => {
        if (currentTab === 'profile') {
          return r.reportedPosts.length === 0;
        } else {
          return r.reportedPosts.length != 0;
        }
      })
      .filter((r) => {
        if (filterBy === 'all') {
          return r;
        } else if (filterBy === 'resolved') {
          return r.resolution != undefined;
        } else if (filterBy === 'not-resolved') {
          return r.resolution === undefined;
        }
      }),
  );

  let unResolvedReports = $derived(
    $reportsQuery.data
      ?.filter((r) => r.reportedProfile.id === profileData.id)
      .filter((r) => r.resolution === undefined),
  );

  $effect(() => {
    pageHeaderStore.set({
      title: profileData?.displayName || `@${handle}`,
    });
  });
</script>

<AccessDeniedLoader queries={[$profileQuery, $reportsQuery]}>
  <div class="">
    {#if $profileQuery?.data}
      <ProfileCard profile={$profileQuery?.data} showAction={false} />
    {/if}
    <p>
      {truncateText($profileQuery?.data?.bio || 'no bio', 500)}
    </p>
  </div>
  <div
    class="flex items-center justify-between border border-b-2 border-t-2 p-1"
  >
    {#if unResolvedReports?.length === 0}
      <div class="rounded-full bg-surface-500 px-3 py-1 text-white">
        All reports resolved
      </div>
    {:else}
      <div class="rounded-full bg-error-500 px-3 py-1 text-white">
        {t('admin.moderation.report.description', {
          reportsCount: unResolvedReports?.length || 0,
          profileName: profileName(profileData),
        })}
      </div>
    {/if}
    <Button
      variant="variant-ringed-surface"
      action={async () => await goto(`/@${profileData.handle}`)}
      >Go to profile</Button
    >
  </div>
  <div class="flex item-center gap-x-4 pt-4 px-2">
    <Button
      title={t(
        'admin.moderation.report.closeOptions.deleteProfile.description',
      )}
      action={() => {
        modalManager.show(DeleteReportedProfileModal, {
          profileId: profileData.id,
        });
      }}
      variant="variant-filled-error"
    >
      {t('admin.moderation.report.closeOptions.deleteProfile.button')}
    </Button>
    <div class="flex-1">
      {t('admin.moderation.report.closeOptions.deleteProfile.description')}
    </div>
  </div>
  <div
    class="w-full mt-4 border-gray-300 border-t border-b px-2 flex justify-between items-center"
  >
    <div class="flex gap-x-4">
      <Button
        class="{currentTab === 'post'
          ? 'border-gray-500 border-b'
          : 'border-0'} py-2"
        action={() => {
          currentTab = 'post';
        }}>Post Reports</Button
      >
      <Button
        class="{currentTab === 'profile'
          ? 'border-gray-500 border-b'
          : 'border-0'} py-2"
        action={() => {
          currentTab = 'profile';
        }}>Profile Reports</Button
      >
    </div>
    <PopupMenu title="filter" icon={Filter}>
      <PopupMenuButton
        title="All"
        text="All"
        action={() => {
          filterBy = 'all';
        }}
      />
      <PopupMenuButton
        title="Resolved"
        text="Resolved"
        action={() => {
          filterBy = 'resolved';
        }}
      />
      <PopupMenuButton
        title="Not resolved"
        text="Not resolved"
        action={() => {
          filterBy = 'not-resolved';
        }}
      />
    </PopupMenu>
  </div>
  <p class="py-2">
    {`${profileReports?.length} ${currentTab === 'profile' ? 'profile reports' : 'posts reports'}`}
  </p>
  <div class="h-[2px] w-full bg-gray-200" />
  {#each profileReports ?? [] as report}
    <ReportContainer {report} />
  {/each}
</AccessDeniedLoader>
