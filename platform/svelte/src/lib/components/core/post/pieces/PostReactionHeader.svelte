<script lang="ts">
  import type { PublicPost } from '@openpeeps/common/types';
  import PostMenu from './PostMenu.svelte';
  import { AvatarWithName } from '../../profile';
  import { getPostStore, groupStore } from '$lib/api';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  interface Props {
    post: PublicPost;
    deleteCallback?: () => void;
    inGroup?: boolean;
  }

  const { t } = i18nContext();

  let {
    post,
    deleteCallback = () => undefined,
    inGroup = false,
  }: Props = $props();

  const replyPostQuery = post.inReplyToId
    ? getPostStore(post.inReplyToId)
    : undefined;

  const groupQuery = groupStore(post.groupId || '');

  let group = $derived($groupQuery.data);
</script>

<div class="flex justify-between border-b py-2">
  <div class="flex w-5/6 items-center gap-2">
    {#if post.groupId && group && !inGroup}
      <!-- group post -->
      {#if post.repost && post.profile?.handle}
        <a href="/@{post.profile.handle}">
          <AvatarWithName profile={post.profile} />
        </a>
        <span class="text-sm font-light">{t('posts.reposted')}</span>
      {:else if $replyPostQuery?.data?.profile?.handle}
        <a href="/@{post.profile.handle}">
          <AvatarWithName profile={post.profile} />
        </a>
        <a class="w-max" href="/posts/{post.inReplyToId}">replied to</a>
        <a class="w-max" href="/@{$replyPostQuery.data.profile.handle}">
          <AvatarWithName profile={$replyPostQuery.data.profile} />
        </a>
        <span class="text-sm font-light">in</span>
      {:else}
        <span class="text-sm font-light">Posted in</span>
      {/if}
      <a
        href="/groups/@{group.handle}"
        class="text-primary flex-1 truncate font-semibold"
      >
        {group.displayName}
      </a>
    {:else}
      <!-- standalone post -->
      {#if post.repost && post.profile?.handle}
        <a href="/@{post.profile.handle}">
          <AvatarWithName profile={post.profile} />
        </a>
        <span class="font-sm font-light">{t('posts.reposted')}</span>
      {:else if $replyPostQuery?.data?.profile?.handle}
        <a href="/@{post.profile.handle}">
          <AvatarWithName profile={post.profile} />
        </a>
        <a href="/posts/{post.inReplyToId}" class="text-sm">
          {t('posts.replyTo')}
        </a>
        <a href="/@{$replyPostQuery.data.profile.handle}">
          <AvatarWithName profile={$replyPostQuery.data.profile} />
        </a>
      {:else}
        &nbsp;
      {/if}
    {/if}
  </div>
  <PostMenu post={post.repost || post} {deleteCallback} />
</div>
