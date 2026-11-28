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
  HistoryIcon,
  FeatherIcon,
  AlertTriangleIcon,
} from '../../icons/index';
import {
  PopupMenu,
  PopupMenuButton,
  PopupSeparator,
  ThemedText,
  ThemedView,
} from '../../ui';
import { useOpenpeeps, apiErrorMessage } from '@openpeepshq/react';
import {
  canCreatePostTypeIgnoringScopes,
  checkGroupCapabilities,
} from '@openpeepshq/common';
import {
  checkRoleCapabilities,
  postHasEditHistory,
} from '@openpeepshq/common/lib';
import type { PublicPost } from '@openpeepshq/common/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { useEditPostModal } from '../post-form/EditPostModalContext';
import { useTranslation } from 'react-i18next';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { DeletePostModal } from './modals/DeletePostModal';
import { ReportProfileOrPostModal } from '../../profile/ReportProfileOrPostModal';
import { RepostModal } from './modals/RepostModal';
import { PostEditHistoryModal } from './modals/PostEditHistoryModal';
import { ReactionsModal } from './modals/ReactionsModal';
import Toast from 'react-native-toast-message';

export interface PostMenuProps {
  post: PublicPost;
  deleteCallback?: () => void;
}

export const PostMenu = ({ post, deleteCallback }: PostMenuProps) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const { data: currentProfile, refetch: refetchCurrentProfile } =
    openpeepsApi.useCurrentProfile();
  const deleteMessageModalRef = useRef<BottomSheetModal>(null);
  const { openEditPost } = useEditPostModal();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const reportProfileModalRef = useRef<BottomSheetModal>(null);
  const reportPostModalRef = useRef<BottomSheetModal>(null);

  const [isBookmarkActionPending, setIsBookmarkActionPending] =
    React.useState(false);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [repostModalOpen, setRepostModalOpen] = React.useState(false);
  const [reactionsModalOpen, setReactionsModalOpen] = React.useState(false);
  const [historyModalOpen, setHistoryModalOpen] = React.useState(false);

  // Hidden (blocked-author tombstone) posts have their entry snapshots
  // stripped server-side; never offer history for them or deleted posts.
  const showEditHistory =
    !post.hidden && !post.deletedAt && postHasEditHistory(post.entries);

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

  // Drafts keep their intended visibility. If the author no longer has
  // permission to create a post at that visibility, publishing is blocked —
  // the menu disables Publish and shows a warning. Scopes are checked
  // server-side at publish time, so the UI gate uses the scope-free variant.
  const isDraft = post.isDraft === true;
  const canPublishDraft = isDraft
    ? canCreatePostTypeIgnoringScopes(
        { profile: currentProfile, scopes: [] },
        post.type,
        [post.visibility]
      )
    : true;
  const [isPublishingDraft, setIsPublishingDraft] = React.useState(false);
  const { data: bookmarkedIdsStore, refetch: refetchBookmarkedIds } =
    openpeepsApi.useCurrentProfileBookmarkedIds();

  const bookmarkPostId = post.repost?.id ?? post.id;
  const isBookmarked = bookmarkedIdsStore?.includes(bookmarkPostId);

  const bookmarkPost = openpeepsApi.bookmarkPostAction({ id: bookmarkPostId });
  const unbookmarkPost = openpeepsApi.unbookmarkPostAction({
    id: bookmarkPostId,
  });
  const deletePost = openpeepsApi.deletePostAction({ id: post.id });
  const publishPost = openpeepsApi.publishPostAction({ id: post.id });
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
    void (async () => {
      try {
        await deletePost();
        Toast.show({
          type: 'success',
          text1: t('posts.delete.success'),
        });
        deleteCallback?.();
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: apiErrorMessage(err, t),
        });
      }
    })();
  };

  const handlePublishDraft = async () => {
    if (isPublishingDraft) return;
    setIsPublishingDraft(true);
    try {
      await publishPost(undefined);
      Toast.show({ type: 'success', text1: t('posts.create.successToast') });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, t),
      });
    } finally {
      setIsPublishingDraft(false);
    }
  };

  const handleFollow = async () => {
    try {
      await followProfile({ reblogs: true, notify: true });
      setIsFollowing(true);
      Toast.show({
        type: 'success',
        text1: t('profile.follow.followedSuccess'),
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: apiErrorMessage(err, t) });
    }
  };

  const handleUnfollow = async () => {
    try {
      await unfollowProfile(undefined);
      setIsFollowing(false);
      Toast.show({
        type: 'success',
        text1: t('profile.follow.unfollowedSuccess'),
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: apiErrorMessage(err, t) });
    }
  };

  const handlePinOnProfile = async () => {
    try {
      await pinOnProfileMutation({
        postId: pinnedOnProfile ? '' : post.id,
      });
      Toast.show({
        type: 'success',
        text1: t(
          pinnedOnProfile
            ? 'posts.unpinOnProfile.success'
            : 'posts.pinOnProfile.success'
        ),
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: apiErrorMessage(err, t) });
    }
    refetchCurrentProfile();
  };

  const handlePinGlobally = async () => {
    try {
      await pinGloballyMutation({
        postId: pinnedGlobally ? '' : post.id,
      });
      Toast.show({
        type: 'success',
        text1: pinnedGlobally
          ? t('posts.unpinGlobally.success')
          : t('posts.pinGlobally.success'),
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: apiErrorMessage(err, t) });
    }
  };

  const handlePinInGroup = async () => {
    try {
      await updateGroup({
        ...post.group!,
        pinnedPostId: post.id,
      });
      Toast.show({
        type: 'success',
        text1: t('posts.pinInGroup.success'),
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: apiErrorMessage(err, t) });
    }
  };

  const handleUnpinInGroup = async () => {
    try {
      await updateGroup({
        ...post.group!,
        pinnedPostId: '',
      });
      Toast.show({
        type: 'success',
        text1: t('posts.unpinInGroup.success'),
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: apiErrorMessage(err, t) });
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
  }, [currentProfile, isCurrentProfileFollowing, post, refetchBookmarkedIds]);

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
          action={() => setRepostModalOpen(true)}
        />
        <PopupMenuButton
          title={t('posts.menu.reactions', { defaultValue: 'Reactions' })}
          text={t('posts.menu.reactions', { defaultValue: 'Reactions' })}
          icon={ThumbsUpIcon}
          action={() => setReactionsModalOpen(true)}
        />
        {showEditHistory ? (
          <PopupMenuButton
            title={t('posts.editHistory.menu', {
              defaultValue: 'Edit history',
            })}
            text={t('posts.editHistory.menu', { defaultValue: 'Edit history' })}
            icon={HistoryIcon}
            action={() => setHistoryModalOpen(true)}
          />
        ) : null}

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
              action={() => {
                if (post.data?.type === 'resource') {
                  navigation.navigate('EditResource', { id: post.id });
                  return;
                }
                openEditPost(post);
              }}
            />
            {isDraft ? (
              <>
                {!canPublishDraft ? (
                  <ThemedView className="p-2">
                    <ThemedView className="flex-row items-start gap-2">
                      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-error" />
                      <ThemedText className="text-sm text-muted-foreground">
                        {t('posts.menu.cannotPublishDraft', {
                          defaultValue:
                            'You no longer have permission to post at this draft\u2019s visibility, so it can\u2019t be published. Change the visibility or ask an admin.',
                        })}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                ) : null}
                <PopupMenuButton
                  title={
                    canPublishDraft
                      ? t('posts.menu.publish', { defaultValue: 'Publish' })
                      : t('posts.menu.publishDisabled', {
                          defaultValue: 'Publish (not allowed)',
                        })
                  }
                  text={t('posts.menu.publish', { defaultValue: 'Publish' })}
                  icon={FeatherIcon}
                  disabled={!canPublishDraft || isPublishingDraft}
                  action={handlePublishDraft}
                  closeOnPress={false}
                />
              </>
            ) : null}
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

      {repostModalOpen && (
        <RepostModal
          open
          reposts={post.reposts ?? []}
          repostCount={post.repostCount ?? 0}
          onClose={() => setRepostModalOpen(false)}
        />
      )}
      {reactionsModalOpen && (
        <ReactionsModal
          open
          reactions={post.reactions ?? []}
          onClose={() => setReactionsModalOpen(false)}
        />
      )}
      {showEditHistory ? (
        <PostEditHistoryModal
          post={post}
          open={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
        />
      ) : null}
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
