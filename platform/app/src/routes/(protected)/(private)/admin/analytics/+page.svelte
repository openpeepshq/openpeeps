<script lang="ts">
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { AccessDeniedLoader, FeedPost, ProfileCard } from '@openpeeps/svelte/components';
  import { adminServerStatsStore } from '@openpeeps/svelte/api';
  import { SignupChart, CommunityOverview } from '@openpeeps/svelte/components';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const { t } = i18nContext();

  const statsQuery = adminServerStatsStore();

  getPageHeaderStore().set({
    title: t('admin.overview.title'),
  });
</script>

<div class="w-full p-4 mx-auto align-center mt-4 space-y-4">
  <AccessDeniedLoader queries={[$statsQuery]}>
    <h2 class="text-lg">{t('admin.overview.communityOverview')}</h2>
    <CommunityOverview statsData={$statsQuery?.data!} />

    <h2 class="text-base">{t('admin.overview.newSignups')}</h2>
    <SignupChart serverStats={$statsQuery?.data!} />

    <h2 class="text-lg">{t('admin.overview.content')}</h2>
    <div class="p-4 pb-10 border rounded">
      <h2 class="text-base">{t('admin.overview.postsRepliesReposts')}</h2>
    </div>
    <div class="w-full grid grid-cols-2 gap-4">
      <div
        class="w-full flex flex-col justify-center items-center h-24 bg-gray-200/40 rounded-md"
      >
        <h3 class="text-sm">{t('admin.overview.allPosts')}</h3>
        <h1 class="text-4xl font-semibold">
          {$statsQuery?.data?.posts.all.all ?? ''}
        </h1>
      </div>
      <div
        class="w-full flex flex-col justify-center items-center h-24 bg-gray-200/40 rounded-md"
      >
        <h3 class="text-sm">{t('admin.overview.postsWithoutReplies')}</h3>
        <h1 class="text-4xl font-semibold">
          {$statsQuery?.data?.posts.withoutReply.all ?? ''}
        </h1>
      </div>
      <div
        class="w-full flex flex-col justify-center items-center h-24 bg-gray-200/40 rounded-md"
      >
        <h3 class="text-sm">{t('admin.overview.postsWithReplies')}</h3>
        <h1 class="text-4xl font-semibold">
          {$statsQuery?.data?.posts.withReplies.all ?? ''}
        </h1>
      </div>
      <div
        class="w-full flex flex-col justify-center items-center h-24 bg-gray-200/40 rounded-md"
      >
        <h3 class="text-sm">{t('admin.overview.replies')}</h3>
        <h1 class="text-4xl font-semibold">
          {$statsQuery?.data?.posts.replies.all ?? ''}
        </h1>
      </div>
    </div>
    {#if $statsQuery.data?.topLists.profiles.year.length}
      <h3 class="text-lg mt-12">
        {t('admin.overview.topProfilesOfYear', { count: $statsQuery.data?.topLists.profiles.year.length })}
      </h3>
      {#each $statsQuery.data?.topLists.profiles.year as profile (profile.id)}
        <ProfileCard {profile} noPadding showAction={false} />
      {/each}
    {/if}
    {#if $statsQuery.data?.topLists.posts.year.length}
      <h3 class="text-lg mt-4">
        {t('admin.overview.topPostsOfYear', { count: $statsQuery.data?.topLists.posts.year.length })}
      </h3>
      {#each $statsQuery.data?.topLists.posts.year ?? [] as post (post.id)}
        <a href={`/posts/${post.repost ? post?.repost?.id : post.id}`}>
          <FeedPost {post} />
        </a>
      {/each}
    {/if}
  </AccessDeniedLoader>
</div>
