<script lang="ts">
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { AccessDeniedLoader, FeedPost, ProfileCard } from '@openpeeps/svelte/components';
  import { adminServerStatsStore } from '@openpeeps/svelte/api';
  import { SignupChart, CommunityOverview } from '@openpeeps/svelte/components';

  const statsQuery = adminServerStatsStore();

  getPageHeaderStore().set({
    title: 'Analytics',
  });
</script>

<div class="w-full p-4 mx-auto align-center mt-4 space-y-4">
  <AccessDeniedLoader queries={[$statsQuery]}>
    <h2 class="text-lg">Community overview</h2>
    <CommunityOverview statsData={$statsQuery?.data!} />

    <h2 class="text-base">New signups</h2>
    <SignupChart serverStats={$statsQuery?.data!} />

    <h2 class="text-lg">Content</h2>
    <div class="p-4 pb-10 border rounded">
      <h2 class="text-base">Posts, replies, reposts</h2>
    </div>
    <div class="w-full grid grid-cols-2 gap-4">
      <div
        class="w-full flex flex-col justify-center items-center h-24 bg-gray-200/40 rounded-md"
      >
        <h3 class="text-sm">All posts</h3>
        <h1 class="text-4xl font-semibold">
          {$statsQuery?.data?.posts.all.all ?? ''}
        </h1>
      </div>
      <div
        class="w-full flex flex-col justify-center items-center h-24 bg-gray-200/40 rounded-md"
      >
        <h3 class="text-sm">Posts without replies</h3>
        <h1 class="text-4xl font-semibold">
          {$statsQuery?.data?.posts.withoutReply.all ?? ''}
        </h1>
      </div>
      <div
        class="w-full flex flex-col justify-center items-center h-24 bg-gray-200/40 rounded-md"
      >
        <h3 class="text-sm">Post with replies</h3>
        <h1 class="text-4xl font-semibold">
          {$statsQuery?.data?.posts.withReplies.all ?? ''}
        </h1>
      </div>
      <div
        class="w-full flex flex-col justify-center items-center h-24 bg-gray-200/40 rounded-md"
      >
        <h3 class="text-sm">Replies</h3>
        <h1 class="text-4xl font-semibold">
          {$statsQuery?.data?.posts.replies.all ?? ''}
        </h1>
      </div>
    </div>
    {#if $statsQuery.data?.topLists.profiles.year.length}
      <h3 class="text-lg mt-12">
        Top {$statsQuery.data?.topLists.profiles.year.length} profiles of the year
      </h3>
      {#each $statsQuery.data?.topLists.profiles.year as profile (profile.id)}
        <ProfileCard {profile} noPadding showAction={false} />
      {/each}
    {/if}
    {#if $statsQuery.data?.topLists.posts.year.length}
      <h3 class="text-lg mt-4">
        Top {$statsQuery.data?.topLists.posts.year.length} posts of the year
      </h3>
      {#each $statsQuery.data?.topLists.posts.year ?? [] as post (post.id)}
        <a href={`/posts/${post.repost ? post?.repost?.id : post.id}`}>
          <FeedPost {post} />
        </a>
      {/each}
    {/if}
  </AccessDeniedLoader>
</div>
