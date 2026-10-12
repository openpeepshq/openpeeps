import { useTranslation } from 'react-i18next';
import { View, Pressable, ActivityIndicator } from 'react-native';
import React, { useEffect } from 'react';
import { ThemedView } from '../components/ui/themed-view';
import { EmptyStateContainer } from '../components/custom/index';
import { useSetPageHeader } from '../components/layout';
import {
  XIcon,
  SearchIcon,
  MessageSquareTextIcon,
} from '../components/icons/index';
import { Input } from '../components/ui/input';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  MainStackParamList,
  TabStackParamList,
} from '../components/navigation/types/index';
import { useOpenpeeps } from '@openpeepshq/react';
import { profileMatchesQuery } from '../lib/utils';
import { CompositeScreenProps } from '@react-navigation/native';
import { useNewConversationStore } from '../stores/useNewConversationStore';

import { FollowUnfollowButton, ProfileCard } from '../components/profile/index';
type DirectoryProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Directory'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const Members: React.FC<DirectoryProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { data: profiles, isLoading } = openpeepsApi.useProfiles();
  const [filteredProfiles, setFilteredProfiles] = React.useState(profiles);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearchButtonClicked, setIsSearchButtonClicked] =
    React.useState(false);
  const { clearMembers, setContt, setMember } = useNewConversationStore();

  useEffect(() => {
    if (searchQuery) {
      setFilteredProfiles(
        (profiles || [])
          ?.filter((profile) => profile.id !== currentProfile?.id)
          ?.filter((profile) => profileMatchesQuery(profile, searchQuery))
      );
    } else {
      setFilteredProfiles(profiles);
    }
  }, [searchQuery, profiles, currentProfile]);

  useSetPageHeader(
    t('navigation.members'),
    isSearchButtonClicked ? (
      <View className="max-w-[200px] flex-row items-center">
        <Input
          className="flex-1"
          placeholder={t('members.searchPlaceholder', {
            defaultValue: 'Enter name or handle',
          })}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Pressable
          className="items-center justify-center px-2"
          onPress={() => {
            setIsSearchButtonClicked(false);
            setSearchQuery('');
          }}
        >
          <XIcon className="text-foreground" />
        </Pressable>
      </View>
    ) : (
      <Pressable onPress={() => setIsSearchButtonClicked(true)}>
        <SearchIcon className="text-foreground" />
      </Pressable>
    )
  );

  return (
    <ThemedView className="grow">
      <KeyboardAwareScrollView className="relative w-full grow flex bg-background gap-y-4 border-t border-border p-2">
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
                      }}
                    >
                      <MessageSquareTextIcon className="size-10 text-foreground" />
                    </Pressable>
                    <FollowUnfollowButton profile={profile} compact />
                  </View>
                ) : null
              }
            />
          );
        })}

        {filteredProfiles?.length === 0 && (
          <EmptyStateContainer type="profiles" copyKey="members.empty" />
        )}
        <View className="mb-36" />
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
