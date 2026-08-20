import { View, Pressable } from 'react-native';
import React, { useCallback, useRef } from 'react';
import { MainScreenProps } from '~/components/navigation/types';
import { GroupWithMeta, PublicProfile } from '@openpeepshq/common';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  FlagIcon,
  LinkIcon,
  MoreHorizontalIcon,
  LogOutIcon,
  SendIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
  LoaderIcon,
  CheckIcon,
} from '~/components/icons';
import { Button } from '~/components/ui/button';
import { ThemedText } from '~/components/ui/themed-text';
import {
  adjustUnseenCounts,
  invalidateUnseenCounts,
  useOpenpeeps,
} from '@openpeepshq/react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { DeleteGroupConfirmationSheet } from '../modals';
import Clipboard from '@react-native-clipboard/clipboard';
import { BASE_URL } from '~/lib/constants';
import Toast from 'react-native-toast-message';
import { useLocalPostStore } from '~/stores/useLocalPostStore';
import { useNewConversationStore } from '~/stores/useNewConversationStore';
import { useTranslation } from 'react-i18next';

interface GroupPageActionsProps extends MainScreenProps<'Group'> {
  groupData: GroupWithMeta;
  isGroupMember: boolean;
}

export const GroupPageActions = ({
  groupData,
  navigation,
}: GroupPageActionsProps) => {
  const { currentProfile, openpeepsApi, queryClient, client } = useOpenpeeps();
  const { t } = useTranslation();
  const deleteGroupModalRef = useRef<BottomSheetModal>(null);
  const { postData, setPostData } = useLocalPostStore();
  const { setContt } = useNewConversationStore();
  const [isLoading, setIsLoading] = React.useState(false);

  const deleteGroup = openpeepsApi.deleteGroupAction({ id: groupData.id });
  const leaveGroup = openpeepsApi.leaveGroupAction({ id: groupData.id });
  const markGroupPostsSeen = openpeepsApi.markGroupPostsSeenAction();
  const { data: groupMembers } = openpeepsApi.useGroupMembers(groupData.id);
  const isGroupMember = currentProfile?.memberships
    ?.map(m => m.group.id)
    .includes(groupData.id);

  const groupMembership = currentProfile?.memberships?.find(m => m.group.id === groupData.id);
  const isGroupAdmin = groupMembership?.roles?.includes('admin');

  const handleDeleteGroupModalPress = useCallback(() => {
    deleteGroupModalRef.current?.present();
  }, []);

  const onDelete = async () => {
    await deleteGroup();
    navigation.pop();
    navigation.navigate('TabNavigator', {
      screen: 'Groups',
    });
  };

  const joinGroup = openpeepsApi.addGroupMemberAction({ id: groupData.id });

  const handleJoinGroup = async () => {
    setIsLoading(true);
    joinGroup({
      ...(currentProfile as PublicProfile),
    })
      .then(() => {

        if (currentProfile && currentProfile.memberships) {
          currentProfile.memberships.push({
            group: groupData,
            roles: ['member'],
          });

        }

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `You have joined ${groupData.displayName}`,
        });
      })
      .catch(() => {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: `Failed to join ${groupData.displayName}`,
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };


  const onLeave = async () => {
    if (
      isGroupAdmin &&
      groupMembers?.filter(m => m.roles?.includes('admin')).length === 1
    ) {
      Toast.show({
        type: 'error',
        text1: 'Cannot leave group',
        text2: 'You are the only admin in the group',
      });
      return;
    }

    await leaveGroup();
    Toast.show({
      type: 'success',
      text1: 'Left group',
      text2: 'You have successfully left the group',
    });
    navigation.pop();
    navigation.navigate('TabNavigator', {
      screen: 'Groups',
    });
  };

  const onRepostToFeed = () => {
    setPostData({
      ...postData,
      data: {
        ...postData.data,
        type: 'note',
        content: `Join our group for exclusive updates and great conversations! ${BASE_URL}/groups/@${groupData.handle}`,
      },
    });
    navigation.navigate('TabNavigator', {
      screen: 'NewPost',
      params: {
        withContent: true,
      },
    });
  };
  const onSendToMessage = () => {
    setContt(
      `Join our group for exclusive updates and great conversations! ${BASE_URL}/groups/@${groupData.handle}`,
    );
    navigation.navigate('SelectPrivateMessageMembers');
  };

  const onMarkAllRead = async () => {
    adjustUnseenCounts(queryClient, client, { clearGroup: groupData.id });
    try {
      await markGroupPostsSeen({ groupId: groupData.id });
    } catch {
      await invalidateUnseenCounts(queryClient, client);
      Toast.show({
        type: 'error',
        text1: t('groups.markAllRead.error', {
          defaultValue: 'Failed to mark group posts as read',
        }),
      });
    }
  };

  return (
    <View className="flex flex-row justify-end gap-x-3 mt-2 pr-2">
      {!isGroupMember && (
        <>
          <Button
            variant={'outline'}
            className="flex-row"
            onPress={handleJoinGroup}>
            {isLoading && (
              <LoaderIcon size={10} className="animate-spin text-white" />
            )}
            <ThemedText>Join</ThemedText>
          </Button>
        </>
      )}
      {isGroupMember && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Pressable className="mr-2 p-2">
                <ShareIcon size={20} className="text-foreground" />
              </Pressable>
            </DropdownMenuTrigger>
            <DropdownMenuContent className=" mt-1">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onPress={onRepostToFeed}
                  className=" flex-row gap-x-2 items-center">
                  <PencilIcon size={16} className="text-foreground" />
                  <ThemedText>Repost to feed</ThemedText>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onPress={onSendToMessage}
                  className=" flex-row gap-x-2 items-center">
                  <SendIcon size={16} className="text-foreground" />
                  <ThemedText>Send in a message</ThemedText>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onPress={() => {
                    try {
                      Clipboard.setString(
                        `${BASE_URL}/groups/@${groupData.handle}`,
                      );
                      Toast.show({
                        type: 'success',
                        text1: 'Link copied',
                        text2: 'Group link copied to clipboard',
                      });
                    } catch (e) { }
                  }}
                  className=" flex-row gap-x-2 items-center">
                  <LinkIcon size={16} className="text-foreground" />
                  <ThemedText>Copy link</ThemedText>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Pressable className="mr-2 p-2">
                <MoreHorizontalIcon size={20} className="text-foreground" />
              </Pressable>
            </DropdownMenuTrigger>
            <DropdownMenuContent className=" mt-1">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onPress={() => void onMarkAllRead()}
                  className=" flex-row gap-x-2 items-center">
                  <CheckIcon size={16} className="text-foreground" />
                  <ThemedText>
                    {t('groups.actions.markAllRead', {
                      defaultValue: 'Mark all posts as read',
                    })}
                  </ThemedText>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onPress={onLeave}
                  className=" flex-row gap-x-2 items-center">
                  <LogOutIcon size={16} className="text-foreground" />
                  <ThemedText>Leave group</ThemedText>
                </DropdownMenuItem>
                {!isGroupAdmin && (
                  <DropdownMenuItem className=" flex-row gap-x-2 items-center">
                    <FlagIcon size={16} className="text-destructive" />
                    <ThemedText className="text-destructive">
                      Report group
                    </ThemedText>
                  </DropdownMenuItem>
                )}
                {isGroupAdmin && (
                  <DropdownMenuItem
                    onPress={handleDeleteGroupModalPress}
                    className=" flex-row gap-x-2 items-center">
                    <TrashIcon size={16} className="text-destructive" />
                    <ThemedText className="text-destructive">Delete</ThemedText>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
      <DeleteGroupConfirmationSheet
        ref={deleteGroupModalRef}
        onDelete={onDelete}
        group={groupData}
      />
    </View>
  );
};
