<script lang="ts">
  import type { PublicPost } from '@openpeeps/common/types';
  import { Avatar } from '$lib/components/core/profile';
  import DisplayUserNameBlock from '$lib/components/core/profile/DisplayUserNameBlock.svelte';
  import PostMenu from '../../pieces/PostMenu.svelte';
  import FeedPostContent from '../../pieces/FeedPostContent.svelte';
  import PostActions from '../../pieces/PostActions.svelte';
  import { UpdatingDate } from '@openpeeps/ui';

  interface Props {
    post: PublicPost;
    isParent?: boolean;
    isChild?: boolean;
    noActions?: boolean;
    noMenu?: boolean;
  }

  let {
    post,
    isParent = false,
    isChild = false,
    noActions = false,
    noMenu = false,
  }: Props = $props();
</script>

<div class="flex flex-row gap-2 p-2">
  <div class="relative w-12 justify-items-stretch">
    <Avatar profile={post.profile} borderless size={3} />
    {#if isParent}
      <div class="bg-surface-300 absolute left-6 h-full w-[1px]"></div>
    {/if}
  </div>
  <div class="w-32 grow">
    <div class="bg-surface-100 rounded-xl p-2">
      <div class="mb-2 flex flex-row items-start justify-between">
        <div class="flex flex-col flex-wrap">
          <DisplayUserNameBlock profile={post.profile} />
        </div>
        <div class="flex flex-row gap-2">
          <span class="text-sm font-extralight">
            <UpdatingDate date={post.createdAt} />
          </span>
          {#if !noMenu}
            <PostMenu {post} />
          {/if}
        </div>
      </div>
      <FeedPostContent {post} />
    </div>
    {#if !noActions}
      <PostActions {post} compact={true} />
    {/if}
  </div>
</div>
