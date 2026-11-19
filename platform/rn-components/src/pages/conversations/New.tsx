import React, { useEffect } from 'react';
import { ThemedView } from '../../components/ui/themed-view';
import { MiniProfileCard, ProfileCard } from '../../components/profile/index';
import { HeaderActionButton, useSetPageHeader } from '../../components/layout';
import { EmptyStateContainer } from '../../components/custom/common/index';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useOpenpeeps } from '@openpeepshq/react';
import { CheckIcon } from '../../components/icons/index';
import { ThemedText } from '../../components/ui/themed-text';
import { ActivityIndicator, View } from 'react-native';
import { MainScreenProps } from '../../components/navigation/types/index';
import { useNewConversationStore } from '../../stores/useNewConversationStore';
import { Input } from '../../components/ui/input';
import { profileMatchesQuery } from '../../lib/utils';
import { blockedPairIds } from '@openpeepshq/common/lib';
import type { Profile, PublicProfile } from '@openpeepshq/common';
import { useTranslation } from 'react-i18next';

type SelectPrivateMessageMembersProps =
  MainScreenProps<'SelectPrivateMessageMembers'>;

export const NewConversation = ({
  navigation,
}: SelectPrivateMessageMembersProps) => {
  const { t } = useTranslation();
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { data: allProfiles, isLoading } = openpeepsApi.useProfiles();
  const [filteredProfiles, setFilteredProfiles] = React.useState(allProfiles);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { members, setMember, removeMember } = useNewConversationStore();

  useEffect(() => {
    const excluded = new Set([
      ...(currentProfile ? [currentProfile.id] : []),
      ...blockedPairIds(currentProfile),
    ]);
    const visible = (allProfiles || []).filter(
      (profile) => !excluded.has(profile.id)
    );
    if (searchQuery) {
      setFilteredProfiles(
        visible.filter((profile) => profileMatchesQuery(profile, searchQuery))
      );
    } else {
      setFilteredProfiles(visible);
    }
  }, [currentProfile, allProfiles, searchQuery]);

  useSetPageHeader(
    t('conversations.createNew.title'),
    <HeaderActionButton
      title={t('common.next', { defaultValue: 'Next' })}
      onPress={() => navigation.navigate('DraftMessage')}
      disabled={members.length === 0}
    />
  );

  return (
    <ThemedView className="flex-1 relative">
      <View className="w-full flex flex-row justify-between items-center p-4">
        <Input
          className="flex-1"
          placeholder={t('conversations.createNew.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <KeyboardAwareScrollView className="flex-1 w-full flex bg-background relative p-2">
        {isLoading && <ActivityIndicator size={'small'} />}

        {members.length > 0 && (
          <ThemedView className="my-4 w-full flex-row flex-wrap gap-2">
            {members.map((member) => (
              <MiniProfileCard
                key={member.id}
                profile={member as PublicProfile}
                onPress={() => removeMember(member as Profile)}
              />
            ))}
          </ThemedView>
        )}
        {members.length > 0 && (
          <ThemedText className="text-center">
            {t('conversations.createNew.selectedCount', {
              count: members.length,
            })}
          </ThemedText>
        )}

        {filteredProfiles?.map((profile) => {
          const selected = members.some((m) => m.id === profile.id);
          // The candidate rows are bare `ProfileCard` rows with no accessible
          // wrapper, so they carry their own screen-reader identity: without
          // it the whole DM picker is invisible to screen readers (issue
          // #1666 round-10 review S1).
          const rowLabel = selected
            ? t('profile.selector.rowSelected', {
                name: profile.displayName || `@${profile.handle}`,
              })
            : profile.displayName || `@${profile.handle}`;
          return (
            <ProfileCard
              key={profile.id}
              profile={profile}
              actionType="select"
              accessibilityRole="button"
              accessibilityLabel={rowLabel}
              accessibilityState={{ selected }}
              rightComponent={
                selected ? (
                  <CheckIcon size={16} className="text-primary" />
                ) : null
              }
              handleSelectProfile={() => {
                if (selected) {
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
            <EmptyStateContainer
              type="profiles"
              copyKey={
                searchQuery
                  ? 'profile.selector.emptySearch'
                  : 'profile.selector.empty'
              }
            />
          </View>
        )}
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
