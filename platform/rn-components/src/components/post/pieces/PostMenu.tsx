import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import {
  PencilIcon,
  Trash2Icon,
  FlagIcon,
  UserXIcon,
  UsersPlusIcon,
  PinIcon,
  BookmarkPlusIcon,
  BookmarkMinusIcon,
  Repeat2Icon,
  ThumbsUpIcon,
} from '../../icons/index';
import { PopupMenu, PopupMenuButton, PopupSeparator } from '../../ui';
import { useOpenpeeps } from '@openpeepshq/react';
import {
  checkGroupCapabilities,
  checkPostCapabilities,
} from '@openpeepshq/common';
import { checkRoleCapabilities } from '@openpeepshq/common/lib';
import type { PublicPost } from '@openpeepshq/common/types';
import { useEditPostModal } from '../post-form/EditPostModalContext';
import { useTranslation } from 'react-i18next';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { DeletePostModal } from './modals/DeletePostModal';
import { ReportProfileOrPostModal } from '../../profile/ReportProfileOrPostModal';
import { RepostModal } from './modals/RepostModal';
import { ReactionsModal } from './modals/ReactionsModal';
import { BASE_URL } from '../../../lib/constants';
import { truncateText } from '../../../lib/utils';
import Toast from 'react-native-toast-message';

export interface PostMenuProps {
  post: PublicPost;
  deleteCallback?: () => void;
}

export const PostMenu = ({ post, deleteCallback }: PostMenuProps) => {
  const { t } = useTranslation();
  const { openpeepsApi, queryClient } = useOpenpeeps();
  const { data: currentProfile, refetch: refetchCurrentProfile } =
    openpeepsApi.useCurrentProfile();
  const deleteMessageModalRef = useRef<BottomSheetModal>(null);
  const { openEditPost } = useEditPostModal();
  const reportProfileModalRef = useRef<BottomSheetModal>(null);
  const reportPostModalRef = useRef<BottomSheetModal>(null);

  const [isBookmarkActionPending, setIsBookmarkActionPending] =
    React.useState(false);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [repostsModalOpen, setRepostsModalOpen] = React.useState(false);
  const [reactionsModalOpen, setReactionsModalOpen] = React.useState(false);

  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const canPinToGroup =
    post.group &&
    checkGroupCapabilities(
      { profile: currentProfile, scopes: [] },
      ['core-groups-pin'],
      post.group
    ).success;
  const pinnedInGroup = post.group?.pinnedPostId === post.id;
  const pinnedOnProfile = currentProfile?.pinnedPostId === post.id;
  const canPinGlobally = !!(
    (['public', 'local'] as string[]).includes(post.visibility) &&
    currentProfile &&
    checkRoleCapabilities(currentProfile.roles ?? [], ['core-config-update'])
      .success
  );
  const pinnedGlobally =
    serverInfo?.communityConfig?.content?.pinnedPost === post.id;
  const { data: bookmarkedIdsStore, refetch: refetchBookmarkedIds } =
    openpeepsApi.useCurrentProfileBookmarkedIds();

  const bookmarkPostId = post.repost?.id ?? post.id;
  const isBookmarked = bookmarkedIdsStore?.includes(bookmarkPostId);

  const bookmarkPost = openpeepsApi.bookmarkPostAction({ id: bookmarkPostId });
  const unbookmarkPost = openpeepsApi.unbookmarkPostAction({
    id: bookmarkPostId,
  });
  const deletePost = openpeepsApi.deletePostAction({ id: post.id });
  const updateGroup = openpeepsApi.updateGroupAction({
    id: post.group?.id ?? '',
  });
  const pinGloballyMutation = openpeepsApi.admin.pinPostGloballyAction();
  const pinOnProfileMutation = openpeepsApi.pinPostOnProfileAction();
  const followProfile = openpeepsApi.followProfileAction({
    id: post.profile.id,
  });
  const unfollowProfile = openpeepsApi.unfollowProfileAction({
    id: post.profile.id,
  });

  const handleDeletePostModalPress = useCallback(() => {
    deleteMessageModalRef.current?.present();
  }, []);

  const handleReportProfileModalPress = useCallback(() => {
    reportProfileModalRef.current?.present();
  }, []);

  const handleReportPostModalPress = useCallback(() => {
    reportPostModalRef.current?.present();
  }, []);

  const handleDelete = async () => {
    void deletePost().then((res) => {
      if (res) {
        Toast.show({
          type: 'success',
          text1: t('posts.delete.success'),
        });
        deleteCallback?.();
      } else {
        Toast.show({
          type: 'error',
          text1: t('posts.delete.error'),
        });
      }
    });
  };

  const handleFollow = async () => {
    const response = await followProfile({ reblogs: true, notify: true });
    if (response) {
      setIsFollowing(true);
      Toast.show({
        type: 'success',
        text1: t('profile.actions.followedSuccess'),
      });
    } else {
      Toast.show({ type: 'error', text1: t('profile.follow.error') });
    }
  };

  const handleUnfollow = async () => {
    const response = await unfollowProfile(undefined);
    if (response) {
      setIsFollowing(false);
      Toast.show({
        type: 'success',
        text1: t('profile.actions.unfollowedSuccess'),
      });
    } else {
      Toast.show({ type: 'error', text1: t('profile.follow.error') });
    }
  };

  const handlePinOnProfile = async () => {
    const response = await pinOnProfileMutation({
      postId: pinnedOnProfile ? '' : post.id,
    });
    if (response) {
      Toast.show({
        type: 'success',
        text1: t(
          pinnedOnProfile
            ? 'posts.unpinOnProfile.success'
            : 'posts.pinOnProfile.success'
        ),
      });
    } else {
      Toast.show({ type: 'error', text1: t('posts.pinOnProfile.error') });
    }
    refetchCurrentProfile();
  };

  const handlePinGlobally = async () => {
    const response = await pinGloballyMutation({
      postId: pinnedGlobally ? '' : post.id,
    });
    if (response) {
      Toast.show({
        type: 'success',
        text1: pinnedGlobally
          ? t('posts.unpinGlobally.success')
          : t('posts.pinGlobally.success'),
      });
    } else {
      Toast.show({ type: 'error', text1: t('posts.pinGlobally.error') });
    }
  };

  const handlePinInGroup = async () => {
    const response = await updateGroup({
      ...post.group!,
      pinnedPostId: post.id,
    });
    if (response) {
      Toast.show({
        type: 'success',
        text1: t('posts.pinInGroup.success'),
      });
    } else {
      Toast.show({ type: 'error', text1: t('posts.pinInGroup.error') });
    }
  };

  const handleUnpinInGroup = async () => {
    const response = await updateGroup({
      ...post.group!,
      pinnedPostId: '',
    });
    if (response) {
      Toast.show({
        type: 'success',
        text1: t('posts.unpinInGroup.success'),
      });
    } else {
      Toast.show({ type: 'error', text1: t('posts.unpinInGroup.error') });
    }
  };

  const handleBookmarkMenuPress = useCallback(async () => {
    if (isBookmarkActionPending) return;
    setIsBookmarkActionPending(true);
    try {
      if (isBookmarked) {
        await unbookmarkPost(undefined);
      } else {
        await bookmarkPost(undefined);
      }
      await refetchBookmarkedIds();
      Toast.show({
        type: 'success',
        text1: isBookmarked
          ? t('posts.unbookmark.success')
          : t('posts.bookmark.success'),
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: t('posts.bookmark.error'),
      });
    } finally {
      setIsBookmarkActionPending(false);
    }
  }, [
    isBookmarked,
    bookmarkPost,
    unbookmarkPost,
    refetchBookmarkedIds,
    isBookmarkActionPending,
    t,
  ]);

  const isCurrentProfileFollowing = currentProfile?.following
    .map((p) => p.id)
    .includes(post.profile.id);

  useEffect(() => {
    setIsFollowing(isCurrentProfileFollowing || false);
    refetchBookmarkedIds();
  }, [currentProfile, post, refetchBookmarkedIds]);

  return (
    <View key={post.id}>
      <PopupMenu
        title={t('posts.menu.title', { defaultValue: 'Post menu' })}
        className="h-max rounded-lg p-2"
      >
        {currentProfile?.id !== post.profile.id ? (
          isFollowing ? (
            <PopupMenuButton
              title={t('profile.actions.unfollow', {
                defaultValue: 'Unfollow',
              })}
              text={t('profile.actions.unfollow', { defaultValue: 'Unfollow' })}
              icon={UserXIcon}
              action={handleUnfollow}
            />
          ) : (
            <PopupMenuButton
              title={t('profile.actions.follow', { defaultValue: 'Follow' })}
              text={t('profile.actions.follow', { defaultValue: 'Follow' })}
              icon={UsersPlusIcon}
              action={handleFollow}
            />
          )
        ) : null}

        <PopupMenuButton
          title={t('posts.menu.reposts', { defaultValue: 'Reposts' })}
          text={t('posts.menu.reposts', { defaultValue: 'Reposts' })}
          icon={Repeat2Icon}
          action={() => setRepostsModalOpen(true)}
        />
        <PopupMenuButton
          title={t('posts.menu.reactions', { defaultValue: 'Reactions' })}
          text={t('posts.menu.reactions', { defaultValue: 'Reactions' })}
          icon={ThumbsUpIcon}
          action={() => setReactionsModalOpen(true)}
        />

        {isBookmarked ? (
          <PopupMenuButton
            title={t('posts.unbookmark.title', {
              defaultValue: 'Remove bookmark',
            })}
            text={t('posts.unbookmark.title', {
              defaultValue: 'Remove bookmark',
            })}
            icon={BookmarkMinusIcon}
            action={handleBookmarkMenuPress}
            closeOnPress={false}
            disabled={isBookmarkActionPending}
          />
        ) : (
          <PopupMenuButton
            title={t('posts.bookmark.title', { defaultValue: 'Bookmark' })}
            text={t('posts.bookmark.title', { defaultValue: 'Bookmark' })}
            icon={BookmarkPlusIcon}
            action={handleBookmarkMenuPress}
            closeOnPress={false}
            disabled={isBookmarkActionPending}
          />
        )}

        {currentProfile?.id === post.profile.id && !post.repost ? (
          <>
            <PopupSeparator />
            <PopupMenuButton
              title={
                pinnedOnProfile
                  ? t('posts.unpinOnProfile.title', {
                      defaultValue: 'Unpin from profile',
                    })
                  : t('posts.pinOnProfile.title', {
                      defaultValue: 'Pin to profile',
                    })
              }
              text={
                pinnedOnProfile
                  ? t('posts.unpinOnProfile.title', {
                      defaultValue: 'Unpin from profile',
                    })
                  : t('posts.pinOnProfile.title', {
                      defaultValue: 'Pin to profile',
                    })
              }
              icon={PinIcon}
              action={handlePinOnProfile}
            />
            <PopupMenuButton
              title={t('common.actions.edit', { defaultValue: 'Edit' })}
              text={t('common.actions.edit', { defaultValue: 'Edit' })}
              icon={PencilIcon}
              action={() => openEditPost(post)}
            />
          </>
        ) : null}

        {canPinGlobally ? (
          <PopupMenuButton
            title={
              pinnedGlobally
                ? t('posts.unpinGlobally.title', {
                    defaultValue: 'Unpin globally',
                  })
                : t('posts.pinGlobally.title', { defaultValue: 'Pin globally' })
            }
            text={
              pinnedGlobally
                ? t('posts.unpinGlobally.title', {
                    defaultValue: 'Unpin globally',
                  })
                : t('posts.pinGlobally.title', { defaultValue: 'Pin globally' })
            }
            icon={PinIcon}
            action={handlePinGlobally}
          />
        ) : null}

        {canPinToGroup && post.group ? (
          pinnedInGroup ? (
            <PopupMenuButton
              title={t('posts.unpinInGroup.title', {
                defaultValue: 'Unpin in group',
              })}
              text={t('posts.unpinInGroup.title', {
                defaultValue: 'Unpin in group',
              })}
              icon={PinIcon}
              action={handleUnpinInGroup}
            />
          ) : (
            <PopupMenuButton
              title={t('posts.pinInGroup.title', {
                defaultValue: 'Pin in group',
              })}
              text={t('posts.pinInGroup.title', {
                defaultValue: 'Pin in group',
              })}
              icon={PinIcon}
              action={handlePinInGroup}
            />
          )
        ) : null}

        {currentProfile?.id === post.profile.id ? (
          <PopupMenuButton
            title={t('common.actions.delete', { defaultValue: 'Delete' })}
            text={t('common.actions.delete', { defaultValue: 'Delete' })}
            icon={Trash2Icon}
            danger
            action={handleDeletePostModalPress}
          />
        ) : null}

        {currentProfile?.id !== post.profile.id ? (
          <>
            <PopupSeparator />
            <PopupMenuButton
              title={t('common.actions.reportPost', {
                defaultValue: 'Report post',
              })}
              text={t('common.actions.reportPost', {
                defaultValue: 'Report post',
              })}
              icon={FlagIcon}
              danger
              action={handleReportPostModalPress}
            />
            <PopupMenuButton
              title={t('common.actions.reportProfile', {
                defaultValue: 'Report @{{handle}}',
                handle: post.profile.handle,
              })}
              text={t('common.actions.reportProfile', {
                defaultValue: 'Report @{{handle}}',
                handle: post.profile.handle,
              })}
              icon={FlagIcon}
              danger
              action={handleReportProfileModalPress}
            />
          </>
        ) : null}
      </PopupMenu>

      <RepostModal
        reposts={post.reposts ?? []}
        repostCount={post.repostCount ?? 0}
        open={repostsModalOpen}
        onClose={() => setRepostsModalOpen(false)}
      />
      <ReactionsModal
        reactions={post.reactions ?? []}
        open={reactionsModalOpen}
        onClose={() => setReactionsModalOpen(false)}
      />
      <DeletePostModal
        ref={deleteMessageModalRef}
        onDelete={handleDelete}
        post={post}
      />
      <ReportProfileOrPostModal
        ref={reportProfileModalRef}
        profile={post.profile}
        reportType="profile"
      />
      <ReportProfileOrPostModal
        ref={reportPostModalRef}
        post={post}
        reportType="post"
      />
    </View>
  );
};
