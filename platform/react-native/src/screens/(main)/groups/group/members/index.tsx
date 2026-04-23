import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MainScreenProps } from '../../../../../components/navigation/types';
import { useOpenpeeps } from '@openpeeps/react';
import {
  GenericHeader,
  GroupMemberCard,
  MakeGroupMemberAdminConfirmationSheet,
  ProfilePickerSheet,
  RemoveAdminPrivilegesFromMemberConfirmationSheet,
  RemoveGroupMemberConfirmationSheet,
} from '../../../../../components/custom';
import { profileMatchesQuery, truncateText } from '../../../../../lib/utils';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { PlusIcon, SearchIcon, XIcon } from '../../../../../components/icons';
import { Input } from '../../../../../components/ui/input';
import { GroupMember, Profile } from '@openpeeps/common';
import { ThemedText } from '../../../../../components/ui/themed-text';
import { ActivityIndicator, Pressable } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import { useNewConversationStore } from '../../../../../stores/useNewConversationStore';
import { ThemedSafeAreaView } from '../../../../../components/ui/themed-safe-area-view';

type GroupMembersProps = MainScreenProps<'GroupMembers'>;

export const GroupMembers = ({ route, navigation }: GroupMembersProps) => {
  const { id } = route.params;
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { data: groupData, isLoading, refetch } = openpeepsApi.useGroup(id);
  const { data: groupMembers, isLoading: isGroupMembersLoading } =
    openpeepsApi.useGroupMembers(id);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [filteredGroupMembers, setFilteredGroupMembers] =
    useState<GroupMember[]>();
  const profilePickerModalRef = useRef<BottomSheetModal>(null);
  const removeMemberModalRef = useRef<BottomSheetModal>(null);
  const makeMemberAdminModalRef = useRef<BottomSheetModal>(null);
  const removeAdminPrvilegesModalRef = useRef<BottomSheetModal>(null);
  const [memberToBeAdmin, setMemberToBeAdmin] = React.useState<Profile>();
  const [memberToLoseAdminPrivileges, setMemberToLoseAdminPrivileges] =
    React.useState<Profile>();
  const [memberToDelete, setMemberToDelete] = React.useState<Profile>();
  const { setMember, clearMembers } = useNewConversationStore();

  const removeMemberFromGroup = openpeepsApi.removeGroupMemberAction({
    id: id,
    memberId: memberToDelete?.id || '',
  });

  const addMembersToGroup = openpeepsApi.addGroupMemberAction({
    id: id,
  });

  const makeMemberAdmin = openpeepsApi.setGroupMemberRolesAction({
    id: id,
    memberId: memberToBeAdmin?.id || '',
  });

  const removeMemberAdminPrivileges =
    openpeepsApi.setGroupMemberRolesAction({
      id: id,
      memberId: memberToLoseAdminPrivileges?.id || '',
    });

  const handleProfileModalPress = useCallback(() => {
    profilePickerModalRef.current?.present();
  }, []);

  const handleRemoveMemberModalPress = useCallback(() => {
    removeMemberModalRef.current?.present();
  }, []);

  const handleMakeMemberAdminModalPress = useCallback(() => {
    makeMemberAdminModalRef.current?.present();
  }, []);

  const handleRemoveAdminPrvilegesModalPress = useCallback(() => {
    removeAdminPrvilegesModalRef.current?.present();
  }, []);

  const toggleSearchEnabler = () =>
    setIsSearchEnabled(prev => {
      setSearchQuery('');
      return !prev;
    });

  useEffect(() => {
    if (searchQuery) {
      setFilteredGroupMembers(
        groupMembers?.filter(m => profileMatchesQuery(m.profile, searchQuery)),
      );
    } else {
      setFilteredGroupMembers(groupMembers);
    }
  }, [searchQuery, groupMembers, currentProfile]);

  const isGroupAdmin = currentProfile?.memberships
    .find(g => g.group.id === groupData?.id)
    ?.roles?.includes('admin');

  const onRemoveMember = async () => {
    removeMemberFromGroup()
      .then(() => {
        Toast.show({
          type: 'success',
          text1: 'Member removed',
          position: 'bottom',
        });
      })
      .catch(() => {
        Toast.show({
          type: 'error',
          text1: 'Failed to remove member',
          position: 'bottom',
        });
      });
  };

  const onAddMembers = async (profiles: Profile[]) => {
    if (!profiles.length) {
      return;
    }
    Promise.all(
      profiles.map(profile =>
        addMembersToGroup({
          ...profile,
          profileStats: {
            followersCount: 0,
            followingCount: 0,
          },
        }),
      ),
    )
      .then(() => {
        Toast.show({
          type: 'success',
          text1: 'Members added',
          position: 'bottom',
        });

        refetch().then(() => { });
      })
      .catch(() => {
        Toast.show({
          type: 'error',
          text1: 'Failed to add members',
          position: 'bottom',
        });
      });
  };

  const onMakeAdmin = async () => {
    makeMemberAdmin({roles: ['admin']})
      .then(() => {
        Toast.show({
          type: 'success',
          text1: 'Member is now an admin',
          position: 'bottom',
        });
        refetch().then(() => { });
      })
      .catch(() => {
        Toast.show({
          type: 'error',
          text1: 'Failed to make member an admin',
          position: 'bottom',
        });
      });
  };

  const onRemoveAdminPrivileges = async () => {
    removeMemberAdminPrivileges({roles: ['member']})
      .then(() => {
        Toast.show({
          type: 'success',
          text1: 'Admin privileges removed',
          position: 'bottom',
        });
        refetch().then(() => { });
      })
      .catch(() => {
        Toast.show({
          type: 'error',
          text1: 'Failed to remove admin privileges',
          position: 'bottom',
        });
      });
  };

  return (
    <ThemedSafeAreaView className="flex-1 relative">
      <GenericHeader
        title={
          isSearchEnabled ? (
            <Input
              className="w-[80%]"
              placeholder="Enter a name or handle"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          ) : (
            truncateText(groupData?.displayName || 'Group', 30)
          )
        }
        rightType="icon"
        onRightButtonPress={toggleSearchEnabler}
        rightButtonIcon={
          isSearchEnabled ? (
            <XIcon className="text-foreground" />
          ) : (
            <SearchIcon className="text-foreground" />
          )
        }
      />
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="w-full flex bg-background relative">
        {(isLoading || isGroupMembersLoading) && (
          <ActivityIndicator size={'small'} />
        )}
        {!(isLoading || isGroupMembersLoading) && (
          <>
            <ThemedText className="text-lg my-10 pl-4">
              {filteredGroupMembers?.length} Member
              {filteredGroupMembers?.length &&
                filteredGroupMembers?.length === 1
                ? 's'
                : ''}
            </ThemedText>
            {filteredGroupMembers?.find(
              m => m.profile.id === currentProfile?.id,
            ) && (
                <GroupMemberCard
                  member={
                    filteredGroupMembers?.find(
                      m => m.profile.id === currentProfile?.id,
                    ) as GroupMember
                  }
                  showActions={false}
                />
              )}
            {filteredGroupMembers
              ?.filter(m => m.profile.id !== currentProfile?.id)
              ?.map((member, idx) => {
                return (
                  <GroupMemberCard
                    key={idx}
                    member={member}
                    handleMessageMember={() => {
                      clearMembers();
                      setMember(member.profile);
                      navigation.navigate('DraftMessage');
                    }}
                    handleMakeAdmin={() => {
                      setMemberToBeAdmin(member.profile);
                      handleMakeMemberAdminModalPress();
                    }}
                    handleRemovePrivilegesAdmin={() => {
                      setMemberToLoseAdminPrivileges(member.profile);
                      handleRemoveAdminPrvilegesModalPress();
                    }}
                    handleRemoveMember={() => {
                      setMemberToDelete(member.profile);
                      handleRemoveMemberModalPress();
                    }}
                    isCurrentProfileAdmin={isGroupAdmin}
                  />
                );
              })}
          </>
        )}
      </KeyboardAwareScrollView>
      <ProfilePickerSheet
        ref={profilePickerModalRef}
        selectType="async"
        asynOnSelect={onAddMembers}
        profilesToExclude={groupMembers?.map(m => m.profile)}
      />
      {isGroupAdmin && (
        <Pressable
          onPress={handleProfileModalPress}
          className="z-20 absolute bottom-10 right-6 size-16 flex items-center justify-center bg-foreground rounded-full">
          <PlusIcon size={24} className="text-background" />
        </Pressable>
      )}

      <MakeGroupMemberAdminConfirmationSheet
        ref={makeMemberAdminModalRef}
        onMakeAdmin={onMakeAdmin}
        profile={memberToBeAdmin as Profile}
      />

      <RemoveAdminPrivilegesFromMemberConfirmationSheet
        ref={removeAdminPrvilegesModalRef}
        onRemovePrivileges={onRemoveAdminPrivileges}
        profile={memberToBeAdmin as Profile}
      />

      <RemoveGroupMemberConfirmationSheet
        ref={removeMemberModalRef}
        onRemove={onRemoveMember}
        profile={memberToDelete as Profile}
      />
    </ThemedSafeAreaView>
  );
};
