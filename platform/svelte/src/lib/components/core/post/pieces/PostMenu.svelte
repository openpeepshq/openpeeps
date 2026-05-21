<script lang="ts">
  // @ts-nocheck
  import {
    followProfileMutation,
    unFollowProfileMutation,
    updateGroupMutation,
    bookmarkPostMutation,
    unbookmarkPostMutation,
  } from '$lib/api';
  import type { PublicPost, PublicProfile } from '@openpeeps/common/types';
  import {
    Pencil,
    Pin,
    Repeat,
    ThumbsUp,
    Trash,
    FlagIcon,
    BookmarkPlus,
    BookmarkMinus,
  } from 'lucide-svelte';
  import { pinGlobally } from '$lib/api';
  import { toaster } from '$lib/utils';
  import { goto } from '$app/navigation';
  import { serverInfoStore } from '$lib/api';
  import {
    checkGroupCapabilities,
    checkPostCapabilities,
    checkRoleCapabilities,
  } from '@openpeeps/common/lib';
  import {
    PopupMenu,
    PopupMenuButton,
    PopupSeparator,
    getModalManager,
  } from '@openpeeps/ui';
  import {
    EditPostModal,
    ReactionsModal,
    DeletePostModal,
    RepostModal,
  } from '$lib/components/core/post';
  import { getServerDataContext } from '$lib/components/serverData';
  import { i18nContext } from '$lib/components/i18n';
  import { ReportProfileOrPostModal } from '$lib/components/core/profile';
  import { getCurrentAuthData, getCurrentProfile } from '$lib/auth';
  import { updatePostStore } from '../post-form/stores';
  import { currentProfileBookmarkedIds } from '$lib/api';

  const me = getCurrentProfile();
  const authData = getCurrentAuthData();

  const { capabilities } = getServerDataContext();

  const { t } = i18nContext();

  const modalManager = getModalManager();
  const toast = toaster();
  const serverInfo = serverInfoStore();
  const bookmarkedIdsStore = currentProfileBookmarkedIds();

  interface Props {
    post: PublicPost;
    deleteCallback?: () => void;
  }

  let { post, deleteCallback = () => {} }: Props = $props();

  let postProfile: PublicProfile = $derived(post.profile);
  let postId = post.id;

  const updateGroup = updateGroupMutation({ id: post.group?.id ?? '' });

  let canPinToGroup = $derived(
    post.group &&
      checkGroupCapabilities(authData, ['core-groups-pin'], post.group).success,
  );

  let pinnedGlobally: boolean = $derived(
    $serverInfo.data?.communityConfig?.content?.pinnedPost === post.id,
  );
  let pinnedInGroup: boolean = $derived(post.group?.pinnedPostId === post.id);

  let canPinGlobally: boolean = $derived(
    ['public', 'local'].includes(post.visibility) &&
      me &&
      checkRoleCapabilities(me?.roles ?? [], ['core-config-update']).success,
  );
  let canDeletePost: boolean = $derived(
    checkPostCapabilities(authData, ['core-posts-delete'], post, capabilities)
      .success,
  );
  let isPostOwner: boolean = $derived(postProfile?.id === me?.id);
  let canReportPost: boolean = $derived(
    checkRoleCapabilities(me?.roles ?? [], ['core-reports-create']).success,
  );
  let isBookmarked: boolean = $derived(
    $bookmarkedIdsStore.data?.includes(post.id) ?? false,
  );

  const pinGloballyMutation = pinGlobally();
  const followProfile = followProfileMutation({ id: post.profile.id });
  const unfollowProfile = unFollowProfileMutation({
    id: post.profile.id,
  });
  const bookmarkPost = bookmarkPostMutation({ id: post.id });
  const unbookmarkPost = unbookmarkPostMutation({ id: post.id });

  const handlePinGlobally = async () => {
    const response = await pinGloballyMutation({
      postId: pinnedGlobally ? '' : postId,
    });
    if (response.success) {
      toast({
        message: pinnedGlobally
          ? t('posts.unpinGlobally.success')
          : t('posts.pinGlobally.success'),
        type: 'success',
      });
    }
  };

  const handlePinInGroup = async () =>
    post.group &&
    updateGroup({ ...post.group, pinnedPostId: post.id })
      .then(() =>
        toast({
          message: t('posts.pinInGroup.success'),
          type: 'success',
        }),
      )
      .catch(() =>
        toast({
          message: t('posts.pinInGroup.error'),
          type: 'error',
          autohide: false,
        }),
      );

  const handleUnpinInGroup = async () =>
    post.group &&
    updateGroup({ ...post.group, pinnedPostId: '' })
      .then(() =>
        toast({
          message: t('posts.unpinInGroup.success'),
          type: 'success',
        }),
      )
      .catch(() =>
        toast({
          message: t('posts.unpinInGroup.error'),
          type: 'error',
          autohide: false,
        }),
      );

  const handleFollow = async () => {
    const response = await followProfile({
      reblogs: true,
      notify: true,
    });
    toast({
      message: response.success
        ? t('profile.follow.success')
        : t('profile.follow.error'),
      type: 'success',
      action: {
        label: 'View Profile',
        response: () => {
          goto(`/@${post.profile.handle}`, {
            invalidateAll: true,
          });
        },
      },
    });
  };
  const handleUnfollow = async () => {
    const response = await unfollowProfile();
    toast({
      message: response.success
        ? t('profile.unfollow.success')
        : t('profile.unfollow.error'),
      type: 'success',
    });
  };

  const handleEditPost = () => {
    if (post.data?.type === 'event') {
      goto(`/events/${post.id}/edit`);
    } else if (post.data?.type === 'article') {
      goto(`/articles/${post.id}/edit`);
    } else {
      updatePostStore.set(post);
      modalManager.show(EditPostModal);
    }
  };
</script>

{#if me}
  <PopupMenu
    class="hover:bg-surface-200 h-max rounded-full"
    menuId="post-menu-{post.id}"
  >
    {#if postProfile?.id !== me?.id}
      {#if me?.following.map((f) => f.id).includes(postProfile?.id)}
        <PopupMenuButton
          title={t('profile.actions.unfollow')}
          action={handleUnfollow}
          text={t('profile.actions.unfollow')}
          loadingText="loading..."
        />
      {:else}
        <PopupMenuButton
          title={t('profile.actions.follow')}
          action={handleFollow}
          text={t('profile.actions.follow')}
          loadingText="loading..."
        />
      {/if}
    {/if}
    <PopupMenuButton
      title={t('posts.menu.reposts')}
      action={() => modalManager.show(RepostModal, { post })}
      icon={Repeat}
      text={t('posts.menu.reposts')}
    />
    <PopupMenuButton
      title={t('posts.menu.reactions')}
      action={() =>
        modalManager.show(ReactionsModal, { reactions: post.reactions })}
      icon={ThumbsUp}
      text={t('posts.menu.reactions')}
    />
    {#if isBookmarked}
      <PopupMenuButton
        title={t('posts.unbookmark.title')}
        action={async () => {
          await unbookmarkPost();
          toast({
            message: t('posts.unbookmark.success'),
            type: 'success',
          });
        }}
        icon={BookmarkMinus}
        text={t('posts.unbookmark.title')}
      />
    {:else}
      <PopupMenuButton
        title={t('posts.bookmark.title')}
        action={async () => {
          await bookmarkPost();
          toast({
            message: t('posts.bookmark.success'),
            type: 'success',
          });
        }}
        icon={BookmarkPlus}
        text={t('posts.bookmark.title')}
      />
    {/if}
    {#if canPinGlobally}
      <PopupMenuButton
        title={pinnedGlobally ? t('posts.unpinGlobally.title'): t('posts.pinGlobally.title')}
        action={handlePinGlobally}
        icon={Pin}
        text={pinnedGlobally ? t('posts.unpinGlobally.title'): t('posts.pinGlobally.title')}
      />
    {/if}
    {#if canPinToGroup}
      {#if pinnedInGroup}
        <PopupMenuButton
          title={t('posts.unpinInGroup.title')}
          action={handleUnpinInGroup}
          icon={Pin}
          text={t('posts.unpinInGroup.title')}
        />
      {:else}
        <PopupMenuButton
          title={t('posts.pinInGroup.title')}
          action={handlePinInGroup}
          icon={Pin}
          text={t('posts.pinInGroup.title')}
        />
      {/if}
    {/if}
    {#if isPostOwner}
      <PopupSeparator />
      <PopupMenuButton
        title={t('common.actions.edit')}
        action={handleEditPost}
        icon={Pencil}
        text={t('common.actions.edit')}
      />
    {/if}
    {#if canDeletePost}
      <PopupMenuButton
        title={t('common.actions.delete')}
        action={() =>
          modalManager.show(DeletePostModal, { post, deleteCallback })}
        icon={Trash}
        text={t('common.actions.delete')}
        danger
      />
    {/if}
    {#if canReportPost}
      <PopupMenuButton
        title={t('common.actions.reportPost')}
        action={() =>
          modalManager.show(ReportProfileOrPostModal, {
            post: post,
            reportType: 'post',
          })}
        icon={FlagIcon}
        text={t('common.actions.reportPost')}
        danger
      />
      <PopupMenuButton
        title={t('common.actions.reportProfile', {
          handle: post.profile.handle,
        })}
        action={() =>
          modalManager.show(ReportProfileOrPostModal, {
            profile: post.profile,
            reportType: 'profile',
          })}
        icon={FlagIcon}
        text={t('common.actions.reportProfile', {
          handle: post.profile.handle,
        })}
        danger
      />
    {/if}
  </PopupMenu>
{/if}
