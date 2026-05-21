import { View, Pressable, Share, ActivityIndicator } from 'react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  EllipsisIcon,
  PencilIcon,
  LinkIcon,
  Trash2Icon,
  FlagIcon,
  UserXIcon,
  UsersPlusIcon,
  PinIcon,
  BookmarkPlusIcon,
  BookmarkMinusIcon,
} from '~/components/icons';
import {
  DropdownMenu,
  type DropdownMenuRef,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { ThemedText } from '~/components/ui/themed-text';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '~/lib/constants';
import { checkGroupCapabilities, checkRoleCapabilities, PublicPost } from '@openpeeps/common';
import { truncateText } from '~/lib/utils';
import { useOpenpeeps } from '@openpeeps/react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { DeletePostSheeConfirmationSheet } from '~/components/custom/modals/post';
import { useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ReportProfileOrPostSheet } from '../../common/report-profile-or-post-sheet';
import { UploadIcon } from '~/components/icons';
interface PostMenuProps {
  post: PublicPost;
}
export const PostMenu = ({ post }: PostMenuProps) => {
  const { t } = useTranslation();
  const { openpeepsApi, queryClient } = useOpenpeeps();
  const { data: currentProfile, refetch: refetchCurrentProfile } =
    openpeepsApi.useCurrentProfile();
  const deleteMessageModalRef = useRef<BottomSheetModal>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const reportProfileModalRef = useRef<BottomSheetModal>(null);
  const reportPostModalRef = useRef<BottomSheetModal>(null);
  const dropdownMenuRef = useRef<DropdownMenuRef>(null);
  const bookmarkActionInFlight = useRef(false);
  const [isBookmarkActionPending, setIsBookmarkActionPending] =
    React.useState(false);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const canPinToGroup = post.group &&
    checkGroupCapabilities({ profile: currentProfile, scopes: [] }, ['core-groups-pin'], post.group).success
  const pinnedInGroup: boolean = post.group?.pinnedPostId === post.id
  const canPinGlobally: boolean = ['public', 'local'].includes(post.visibility) &&
      currentProfile &&
      checkRoleCapabilities(currentProfile?.roles, ['core-config-update']).success || false
  const pinnedGlobally: boolean = 
    serverInfo?.communityConfig?.content?.pinnedPost === post.id
  const {data: bookmarkedIdsStore, refetch: refetchBookmarkedIds} = openpeepsApi.useCurrentProfileBookmarkedIds();

  const bookmarkPostId = post.repost?.id ?? post.id;

  const isBookmarked = bookmarkedIdsStore?.includes(bookmarkPostId);

  const bookmarkPost = openpeepsApi.bookmarkPostAction({id: bookmarkPostId});
  const unbookmarkPost = openpeepsApi.unbookmarkPostAction({id: bookmarkPostId});

  const deletePost = openpeepsApi.deletePostAction({
    id: post.id,
  });

  const updateGroup = openpeepsApi.updateGroupAction({ id: post.group?.id as string });
  const pinGloballyMutation = openpeepsApi.admin.pinPostGloballyAction();

  const followProfile = openpeepsApi.followProfileAction({ id: post.profile.id });
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
    void deletePost().then((res: unknown) => {
      if (res) {
        Toast.show({
          type: 'success',
          text1: t('posts.delete.success'),
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('posts.delete.error'),
        });
      }
    });
  };

  const handleFollow = async () => {
    const response = await followProfile({
      reblogs: true,
      notify: true,
    });
    await refetchCurrentProfile();
    Toast.show({
      type: response.success ? 'success' : 'error',
      text1: response.success
        ? t('profile.follow.followedSuccess')
        : t('profile.follow.error'),
    });
    await queryClient.invalidateQueries();
  };

  const handleUnfollow = async () => {
    const response = await unfollowProfile();
    await refetchCurrentProfile();
    Toast.show({
      type: response.success ? 'success' : 'error',
      text1: response.success
        ? t('profile.follow.unfollowedSuccess')
        : t('profile.follow.error'),
    });
    await queryClient.invalidateQueries();
  };

  const handlePinInGroup = async () =>
    post.group &&
    updateGroup({ ...post.group, pinnedPostId: post.id })
      .then(() =>
        Toast.show({
          type:  'success' ,
          text1: t('posts.pinInGroup.success'),
      }))
      .catch(() =>
        Toast.show({
          type:  'error' ,
          text1: t('posts.pinInGroup.error'),
          autoHide: false
    })
  );

  const handleUnpinInGroup = async () =>
    post.group &&
    updateGroup({ ...post.group, pinnedPostId: '' })
      .then(() =>
        Toast.show({
          type:  'success' ,
          text1: t('posts.unpinInGroup.success'),
      }))
      .catch(() =>
        Toast.show({
          type:  'error' ,
          text1: t('posts.create.error'),
          autoHide: false
    })
  );

  const handlePinGlobally = async () => {
    const response = await pinGloballyMutation({
      postId: pinnedGlobally ? '' : post.id,
    });
    if (response.success) {
        Toast.show({
          type:  'success' ,
          text1: pinnedGlobally
          ? t('posts.unpinGlobally.success')
          : t('posts.pinGlobally.success'),
      })
    }
  };

  const handleBookmarkMenuPress = useCallback(async () => {
    if (bookmarkActionInFlight.current) {
      return;
    }
    bookmarkActionInFlight.current = true;
    setIsBookmarkActionPending(true);
    try {
      if (isBookmarked) {
        await unbookmarkPost();
        Toast.show({
          type: 'success',
          text1: t('posts.unbookmark.success'),
        });
      } else {
        await bookmarkPost();
        Toast.show({
          type: 'success',
          text1: t('posts.bookmark.success'),
        });
      }
      await refetchBookmarkedIds();
    } finally {
      bookmarkActionInFlight.current = false;
      setIsBookmarkActionPending(false);
      dropdownMenuRef.current?.close();
    }
  }, [
    isBookmarked,
    bookmarkPost,
    unbookmarkPost,
    refetchBookmarkedIds,
    t,
  ]);

  useEffect(() => {
    const isCurrentProfileFollowing = currentProfile?.following
      .map((p) => p.id)
      .includes(post.profile.id);

    setIsFollowing(isCurrentProfileFollowing || false);
    refetchBookmarkedIds()
  }, [currentProfile, post]);

  return (
    <View key={post.id}>
      <DropdownMenu ref={dropdownMenuRef}>
        <DropdownMenuTrigger asChild>
          <Pressable className="mr-2 p-2">
            <EllipsisIcon className="text-foreground" />
          </Pressable>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mt-1 ">
          <DropdownMenuGroup className="mr-4">
            <DropdownMenuItem
              onPress={() => {
                try {
                  Clipboard.setString(`${BASE_URL}/post/${post.id}`);
                  Toast.show({
                    type: 'success',
                    text1: t('posts.copyPostLink.success'),
                    text2: t('posts.copyPostLink.successMessage'),
                  });
                } catch (e) {
                  Toast.show({
                    type: 'error',
                    text1: t('posts.copyPostLink.error'),
                    text2: t('posts.copyPostLink.errorMessage'),
                  });
                }
              }}
              className=" flex-row gap-x-2 items-center">
              <LinkIcon size={16} className="text-foreground" />
              <ThemedText>{t('posts.copyPostLink.submit')}</ThemedText>
            </DropdownMenuItem>

            <DropdownMenuItem
              onPress={() => {
                Share.share({
                  message: t('posts.actions.shareMessage'),
                  url: `${BASE_URL}/post/${post.id}`,
                });
              }}
              className=" flex-row gap-x-2 items-center">
              <UploadIcon size={16} className="text-foreground" />
              <ThemedText>{t('posts.actions.shareMessage')}</ThemedText>
            </DropdownMenuItem>

            {currentProfile?.id === post.profile.id && !post.repost && (
              <>
                <DropdownMenuItem
                  onPress={() => {
                    navigation.navigate('EditPost', {
                      id: post.id,
                    });
                  }}
                  className=" flex-row gap-x-2 items-center">
                  <PencilIcon size={16} className="text-foreground" />
                  <ThemedText>{t('common.actions.edit')}</ThemedText>
                </DropdownMenuItem>
              </>
            )}
            {/* <DropdownMenuItem className=" flex-row gap-x-2 items-center">
              <ClockIcon size={16} className="text-foreground" />
              <ThemedText>Edit History</ThemedText>
            </DropdownMenuItem> */}
            {currentProfile?.id !== post.profile.id && (
              <>
                {isFollowing ? (
                  <DropdownMenuItem
                    onPress={handleUnfollow}
                    className=" flex-row gap-x-2 items-center">
                    <UserXIcon size={16} className="text-foreground" />
                    <ThemedText>
                      {t('profile.actions.unfollow', {
                        name: truncateText(
                          post?.profile?.displayName ||
                          `@${post?.profile?.handle}`,
                          5,
                        ),
                      })}
                    </ThemedText>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onPress={handleFollow}
                    className=" flex-row gap-x-2 items-center">
                    <UsersPlusIcon size={16} className="text-foreground" />
                    <ThemedText>
                      {t('profile.actions.follow', {
                        name: truncateText(
                          post?.profile?.displayName ||
                          `@${post?.profile?.handle}`,
                          5,
                        ),
                      })}
                    </ThemedText>
                  </DropdownMenuItem>
                )}
              </>
            )}
            {currentProfile?.id === post.profile.id && (
              <DropdownMenuItem
                onPress={handleDeletePostModalPress}
                className=" flex-row gap-x-2 items-center text-destructive">
                <Trash2Icon size={16} className="text-destructive" />
                <ThemedText className="text-destructive">
                  {t('common.actions.delete')}
                </ThemedText>
              </DropdownMenuItem>
            )}
            {currentProfile?.id !== post.profile.id && (
              <>
                <DropdownMenuItem
                  onPress={handleReportPostModalPress}
                  className=" flex-row gap-x-2 items-center text-destructive">
                  <FlagIcon size={16} className="text-destructive" />
                  <ThemedText className="text-destructive">
                    {t('common.actions.reportPost')}
                  </ThemedText>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onPress={handleReportProfileModalPress}
                  className=" flex-row gap-x-2 items-center text-destructive">
                  <FlagIcon size={16} className="text-destructive" />
                  <ThemedText className="text-destructive">
                    {t('common.actions.reportProfile', {
                      handle: post.profile.handle,
                    })}
                  </ThemedText>
                </DropdownMenuItem>
              </>
            )}
            {canPinGlobally && (
              <DropdownMenuItem
                onPress={handlePinGlobally}
                className=" flex-row gap-x-2 items-center text-destructive">
                <PinIcon size={16} className="text-destructive" />
                <ThemedText className="text-destructive">
                  {pinnedGlobally ? t('posts.unpinGlobally.title'): t('posts.pinGlobally.title')}
                </ThemedText>
              </DropdownMenuItem>
            )}
            {canPinToGroup && (
              <>
                {pinnedInGroup ? (
                  <DropdownMenuItem
                    onPress={handleUnpinInGroup}
                    className=" flex-row gap-x-2 items-center">
                    <PinIcon size={16} className="text-foreground" />
                    <ThemedText>
                      {t('posts.unpinInGroup.title')}
                    </ThemedText>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onPress={handlePinInGroup}
                    className=" flex-row gap-x-2 items-center">
                    <PinIcon size={16} className="text-foreground" />
                    <ThemedText>
                      {t('posts.pinInGroup.title')}
                    </ThemedText>
                  </DropdownMenuItem>
                )}
              </>
            )}
            {isBookmarked ? (
              <DropdownMenuItem
                closeOnPress={false}
                disabled={isBookmarkActionPending}
                onPress={handleBookmarkMenuPress}
                className=" flex-row gap-x-2 items-center">
                {isBookmarkActionPending ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <BookmarkMinusIcon size={16} className="text-foreground" />
                )}
                <ThemedText>{t('posts.unbookmark.title')}</ThemedText>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                closeOnPress={false}
                disabled={isBookmarkActionPending}
                onPress={handleBookmarkMenuPress}
                className=" flex-row gap-x-2 items-center">
                {isBookmarkActionPending ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <BookmarkPlusIcon size={16} className="text-foreground" />
                )}
                <ThemedText>{t('posts.bookmark.title')}</ThemedText>
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeletePostSheeConfirmationSheet
        ref={deleteMessageModalRef}
        onDelete={handleDelete}
        post={post}
      />
      <ReportProfileOrPostSheet
        ref={reportProfileModalRef}
        profile={post.profile}
        reportType="profile"
      />
      <ReportProfileOrPostSheet
        ref={reportPostModalRef}
        post={post}
        reportType="post"
      />
    </View>
  );
};
