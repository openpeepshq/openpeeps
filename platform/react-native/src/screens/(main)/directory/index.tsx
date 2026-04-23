import {View, Pressable, ActivityIndicator} from 'react-native';
import React, {useEffect} from 'react';
import {ThemedView} from '~/components/ui/themed-view';
import {
  EmptyStateContainer,
  FollowUnfollowButton,
  ProfileCard,
  TabScreensHeader,
} from '~/components/custom';
import {ThemedText} from '~/components/ui/themed-text';
import {XIcon, SearchIcon, MessageSquareTextIcon} from '~/components/icons';
import {Input} from '~/components/ui/input';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  MainStackParamList,
  TabStackParamList,
} from '~/components/navigation/types';
import {useOpenpeeps} from '@openpeeps/react';
import {profileMatchesQuery} from '~/lib/utils';
import {CompositeScreenProps} from '@react-navigation/native';
import {useNewConversationStore} from '~/stores/useNewConversationStore';

type DirectoryProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Directory'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const Directory: React.FC<DirectoryProps> = ({navigation}) => {
  const {openpeepsApi, currentProfile} = useOpenpeeps();
  const {data: profiles, isLoading} = openpeepsApi.useProfiles();
  const [filteredProfiles, setFilteredProfiles] = React.useState(profiles);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearchButtonClicked, setIsSearchButtonClicked] =
    React.useState(false);
  const {clearMembers, setContt, setMember} = useNewConversationStore();

  useEffect(() => {
    if (searchQuery) {
      setFilteredProfiles(
        (profiles || [])
          ?.filter(profile => profile.id !== currentProfile?.id)
          ?.filter(profile => profileMatchesQuery(profile, searchQuery)),
      );
    } else {
      setFilteredProfiles(profiles);
    }
  }, [searchQuery, profiles, currentProfile]);

  return (
    <ThemedView style={{flexGrow: 1}}>
      <TabScreensHeader
        children={
          <>
            {!isSearchButtonClicked ? (
              <View className="w-full flex flex-row justify-between items-center p-4">
                <ThemedText className="text-xl">Members</ThemedText>
                <Pressable onPress={() => setIsSearchButtonClicked(true)}>
                  <SearchIcon className="text-foreground" />
                </Pressable>
              </View>
            ) : (
              <View className="w-full flex flex-row justify-between items-center p-4">
                <Input
                  className="flex-1"
                  placeholder="Enter name or handle"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <Pressable
                  className=" w-[10%] flex justify-center items-center"
                  onPress={() => {
                    setIsSearchButtonClicked(false);
                    setSearchQuery('');
                  }}>
                  <XIcon className="text-foreground" />
                </Pressable>
              </View>
            )}
          </>
        }
      />
      <KeyboardAwareScrollView
        className="w-full flex bg-background relative p-2 gap-y-4 border-t-2 border-gray-700 "
        style={{flexGrow: 1}}>
        {isLoading && <ActivityIndicator size={'small'} />}
        {filteredProfiles?.map((profile, index) => {
          return (
            <ProfileCard
              key={index}
              profile={profile}
              rightComponent={
                profile?.id !== currentProfile?.id ? (
                  <View className="flex flex-row items-center gap-x-4">
                    <Pressable
                      onPress={() => {
                        clearMembers();
                        setContt('');
                        setMember(profile);
                        navigation.navigate('DraftMessage');
                      }}>
                      <MessageSquareTextIcon className="size-10 text-foreground" />
                    </Pressable>
                    <FollowUnfollowButton
                      profile={profile}
                      useDifferentVariant={true}
                    />
                  </View>
                ) : null
              }
            />
          );
        })}

        {filteredProfiles?.length === 0 && (
          <EmptyStateContainer type="profiles" />
        )}
        <View className="mb-36" />
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
