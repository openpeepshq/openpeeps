import React, { useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MainScreenProps } from '../../../components/navigation/types';
import { useOpenpeeps } from '@openpeeps/react';
import { ThemedText } from '../../../components/ui/themed-text';
import {
  ActivityIndicator,
  Linking,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';

import {
  OpenPeepsMarkdown,
  EmptyStateContainer,
  Feed,
  GenericHeader,
  GroupCard,
  ProfileActions,
  ProfileHeader,
} from '../../../components/custom';
import { TouchableOpacity } from 'react-native';
import {
  BriefcaseIcon,
  Building2Icon,
  InstagramIcon,
  Link2Icon,
  LinkedinIcon,
  MapPinIcon,
  RssIcon,
  LucideIcon,
} from '../../../components/icons';
import { ThemedSafeAreaView } from '../../../components/ui/themed-safe-area-view';
import { ProfileData } from '@openpeeps/common';
import { useTranslation } from 'react-i18next';
import { handleScroll, isValidUrl } from '../../../lib/utils';
import { useFocusEffect } from '@react-navigation/native';
type ProfileProps = MainScreenProps<'Profile'>;

export const Profile: React.FC<ProfileProps> = ({ navigation, route }) => {
  const { openpeepsApi } = useOpenpeeps();
  const { handle } = route.params;
  const {
    data: profileData,
    isLoading,
    isError,
  } = openpeepsApi.useProfileByHandle(handle);
  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const { t } = useTranslation();
  const {
    data: currentProfile,
    refetch: currentProfileRefetch,
  } = openpeepsApi.useCurrentProfile();

  const query = openpeepsApi.usePostsByProfile(profileData?.id || '', {
    limit: 15,
  });
  const { data: groups, isLoading: isGroupsLoading } = openpeepsApi.useCommonGroups(
    profileData?.id || '',
  );
  const [tabValue, setTabValue] = useState('posts');
  useFocusEffect(
    React.useCallback(() => {
      currentProfileRefetch();
    }, [currentProfileRefetch]),
  );
  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader title={profileData?.displayName || 'Profile'} />
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="w-full flex bg-background relative"
        onScroll={({ nativeEvent }) =>
          handleScroll(nativeEvent, query)
        }
        scrollEventThrottle={16}>
        {isLoading && <ActivityIndicator size={'small'} />}
        {!isLoading && !isError && (
          <View className="w-full">
            <ProfileHeader profile={profileData} />
            {profileData && (
              <ProfileActions
                navigation={navigation}
                route={route}
                profile={profileData}
                isCurrentProfile={currentProfile?.id === profileData.id}
              />
            )}
            <View className="px-4 pt-2 w-full flex-1 gap-y-2 relative">
              <View className="gap-1 mt-5">
                <ThemedText className="text-lg font-semibold">
                  {profileData?.displayName || profileData?.handle}
                </ThemedText>
                <ThemedText className="text-muted-foreground">
                  {`@${profileData?.handle}`}
                </ThemedText>
                <OpenPeepsMarkdown source={profileData?.bio || 'No bio yet'} />
              </View>
              <View className="flex flex-row my-2 gap-x-6 gap-y-2 flex-wrap">
                {(profileData as ProfileData)?.location && (
                  <ProfileLinks
                    Icon={MapPinIcon}
                    title={(profileData as ProfileData)?.location?.text || '-'}
                    disabled={true}
                  />
                )}
                {serverInfo &&
                  (serverInfo.communityConfig.profiles?.additionalFields
                    ?.length || 0) > 0 && (
                    <>
                      {serverInfo.communityConfig.profiles?.additionalFields?.map(
                        (field, index) => {
                          const currentField = profileData?.fields?.find(
                            f => f.name === field.label,
                          );
                          const isLink = isValidUrl(currentField?.value);

                          return (
                            <ProfileLinks
                              key={index}
                              url={isLink ? currentField?.value : undefined}
                              disabled={!isLink}
                              Icon={
                                currentField?.name.toLowerCase() === 'company'
                                  ? Building2Icon
                                  : currentField?.name.toLowerCase() ===
                                    'website'
                                    ? Link2Icon
                                    : currentField?.name.toLowerCase() === 'role'
                                      ? BriefcaseIcon
                                      : currentField?.name.toLowerCase() ===
                                        'linkedin'
                                        ? LinkedinIcon
                                        : currentField?.name.toLowerCase() ===
                                          'instagram'
                                          ? InstagramIcon
                                          : null
                              }
                              title={currentField?.value || '-'}
                            />
                          );
                        },
                      )}
                    </>
                  )}
              </View>
              <View className="flex flex-row my-2 gap-x-4">
                <TouchableWithoutFeedback
                  onPress={() => {
                    navigation.navigate('ProfileFollowers', {
                      id: profileData?.id || '',
                    });
                  }}>
                  <View className="flex flex-row gap-x-2 underline">
                    <ThemedText className="font-semibold">
                      {profileData?.profileStats?.followersCount}
                    </ThemedText>
                    <ThemedText className="text-muted-foreground">
                      {t('profile.followers.title')}
                    </ThemedText>
                  </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback
                  onPress={() => {
                    navigation.navigate('ProfileFollowing', {
                      id: profileData?.id || '',
                    });
                  }}>
                  <View className="flex flex-row gap-x-2 underline">
                    <ThemedText className=" font-semibold">
                      {profileData?.profileStats?.followingCount}
                    </ThemedText>
                    <ThemedText className=" text-muted-foreground">
                      {t('profile.following.title')}
                    </ThemedText>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </View>
            <Tabs
              value={tabValue}
              onValueChange={setTabValue}
              className="w-full mx-auto flex-col gap-1.5">
              <TabsList className="flex-row w-full bg-transparent border-muted rounded-none border-b p-0 px-3">
                <TabsTrigger
                  value="posts"
                  className={`${tabValue === 'posts' ? 'border-b-2 border-foreground' : ''
                    }`}>
                  <ThemedText>Posts</ThemedText>
                </TabsTrigger>
                <TabsTrigger
                  value="groups"
                  className={`${tabValue === 'groups' ? 'border-b-2 border-foreground' : ''
                    }`}
                  onPress={() => {
                    setTabValue('groups');
                  }}>
                  <ThemedText>Groups</ThemedText>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="p-0">
                <Feed query={query} />
              </TabsContent>
              <TabsContent value="groups">
                {isGroupsLoading && <ActivityIndicator size={'small'} />}
                {!isGroupsLoading && groups?.length === 0 && (
                  <EmptyStateContainer type="groups" />
                )}
                {!isGroupsLoading &&
                  groups?.map((group, index) => {
                    return (
                      <GroupCard
                        key={index}
                        group={group}
                        isGroupMember={true}
                        handleViewGroup={() =>
                          navigation.navigate('Group', { id: group.id })
                        }
                      />
                    );
                  })}
              </TabsContent>
            </Tabs>
          </View>
        )}
        {!isLoading && isError && (
          <View className="w-full">
            <View className="px-4 pt-2 w-full flex-1 gap-y-2 relative justify-center items-center">
              <RssIcon className="text-muted-foreground" size={54} />
              <ThemedText className="text-muted-foreground text-center mt-2">
                {t('profile.notFound.title')}
              </ThemedText>
              <ThemedText className="text-muted-foreground text-center">
                {t('profile.notFound.description')}
              </ThemedText>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};

interface ProfileLinksProps {
  Icon: LucideIcon | null;
  title: string;
  url?: string;
  disabled?: boolean;
}

const ProfileLinks: React.FC<ProfileLinksProps> = ({ Icon, title, url, disabled = false }) => {
  return (
    <TouchableOpacity
      className="flex flex-row gap-x-1 items-center"
      onPress={() => {
        url && Linking.openURL(url);
      }}
      disabled={disabled}
    >
      {Icon && <Icon size={16} className="text-foreground" />}
      <ThemedText
        className={`${url ? 'text-blue-400' : 'text-gray-400'} text-base`}>
        {title}
      </ThemedText>
    </TouchableOpacity>
  );
};
