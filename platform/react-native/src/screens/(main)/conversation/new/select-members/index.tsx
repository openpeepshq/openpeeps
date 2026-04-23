import React, { useEffect } from 'react';
import { ThemedView } from '~/components/ui/themed-view';
import {
  ProfileCard,
} from '~/components/custom/profile';
import { GenericHeader } from '~/components/custom/headers';
import { EmptyStateContainer } from '~/components/custom/common';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useOpenpeeps } from '@openpeeps/react';
import { CheckIcon, XIcon } from '~/components/icons';
import { ThemedText } from '~/components/ui/themed-text';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { MainScreenProps } from '~/components/navigation/types';
import { useNewConversationStore } from '~/stores/useNewConversationStore';
import { Input } from '~/components/ui/input';
import { profileMatchesQuery } from '~/lib/utils';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';

type SelectPrivateMessageMembersProps =
  MainScreenProps<'SelectPrivateMessageMembers'>;

export const SelectPrivateMessageMembers = ({
  navigation,
}: SelectPrivateMessageMembersProps) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { data: allProfiles, isLoading } = openpeepsApi.useProfiles();
  const [filteredProfiles, setFilteredProfiles] = React.useState(allProfiles);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { members, setMember, removeMember } = useNewConversationStore();

  useEffect(() => {
    if (searchQuery) {
      setFilteredProfiles(
        (allProfiles || [])
          ?.filter(profile => profile.id !== currentProfile?.id)
          ?.filter(profile => profileMatchesQuery(profile, searchQuery)),
      );
    } else {
      setFilteredProfiles(allProfiles);
    }
  }, [currentProfile, allProfiles, searchQuery]);

  return (
    <ThemedSafeAreaView className="flex-1 relative">
      <GenericHeader
        title={'Select Members'}
        rightButtonTitle="Next"
        rightType="button"
        rightButtonDisabled={members.length === 0}
        onRightButtonPress={() => {
          navigation.navigate('DraftMessage');
        }}
      />
      <View className="w-full flex flex-row justify-between items-center p-4">
        <Input
          className="flex-1"
          placeholder="Enter name or handle"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <KeyboardAwareScrollView className="flex-1 w-full flex bg-background relative p-2">
        {isLoading && <ActivityIndicator size={'small'} />}

        {members.length > 0 && (
          <ThemedView className=" my-4 w-full grid grid-cols-2 gap-2">
            {members.map((profile, index) => (
              <ThemedView key={index} className="col-span-1">
                <ProfileCard
                  profile={profile}
                  hasAction={true}
                  actionType="select"
                  handleSelectProfile={() => removeMember(profile)}
                  rightComponent={
                    <Pressable onPress={() => removeMember(profile)}>
                      <XIcon className="text-foreground" />
                    </Pressable>
                  }
                />
              </ThemedView>
            ))}
          </ThemedView>
        )}
        {members.length > 0 && (
          <ThemedText className="text-center">
            {members.length} selected
          </ThemedText>
        )}

        {filteredProfiles?.map((profile, index) => {
          return (
            <ProfileCard
              key={index}
              profile={profile}
              hasAction={true}
              actionType="select"
              rightComponent={
                <>
                  {members.includes(profile) ? (
                    <CheckIcon className="text-foreground" />
                  ) : null}
                </>
              }
              handleSelectProfile={() => {
                if (members.includes(profile)) {
                  removeMember(profile);
                } else {
                  setMember(profile);
                }
              }}
            />
          );
        })}

        {!isLoading && filteredProfiles?.length === 0 && (
          <View className="flex-1 items-center justify-center mt-4 pb-12">
            <EmptyStateContainer type="profiles" />
          </View>
        )}
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
