import React, {forwardRef, useEffect, useState} from 'react';
import {View, ScrollView, ActivityIndicator} from 'react-native';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ThemedText} from '~/components/ui/themed-text';
import {PublicProfile} from '@openpeepshq/common';
import {useOpenpeeps} from '@openpeepshq/react';
import {profileMatchesQuery} from '~/lib/utils';
import {CheckIcon, SearchIcon} from '~/components/icons';
import {Input} from '~/components/ui/input';
import {BaseSheet, SheetFooter} from '../common';
import Toast from 'react-native-toast-message';
import {MiniProfileCard, ProfileCard} from '../../profile/profile-card';
import {useTranslation} from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface ProfilePickerSheetProps {
  onSelect?: (profile: PublicProfile[]) => void;
  asynOnSelect?: (profile: PublicProfile[]) => Promise<void>;
  selectType?: 'async' | 'sync';
  title?: string;
  profilesToExclude?: PublicProfile[];
  initialProfiles?: PublicProfile[];
  editMode?: boolean;
  single?: boolean;
}

export const ProfilePickerSheet = forwardRef<
  BottomSheetModal,
  ProfilePickerSheetProps
>(
  (
    {
      onSelect,
      asynOnSelect,
      title = 'Add members',
      profilesToExclude,
      selectType = 'sync',
      initialProfiles,
      editMode = false,
      single = false,
    },
    ref,
  ) => {
    const {openpeepsApi, currentProfile} = useOpenpeeps();
    const [selectedProfiles, setSelectedProfiles] = useState<PublicProfile[]>(
      initialProfiles || [],
    );
    const {data: profiles, isLoading} = openpeepsApi.useProfiles();
    const [filteredProfiles, setFilteredProfiles] = useState(profiles);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const {t} = useTranslation();

    const resetStates = () => {
      if (!editMode) {
        setSelectedProfiles([]);
      }
      setSearchQuery('');
      setLoading(false);
      setFilteredProfiles(profiles);
    };

    useEffect(() => {
      if (searchQuery) {
        setFilteredProfiles(
          (profiles || [])
            .filter(p =>
              profilesToExclude
                ? !profilesToExclude.some(m => m.id === p.id)
                : true,
            )
            ?.filter(profile => profile.id !== currentProfile?.id)
            ?.filter(profile => profileMatchesQuery(profile, searchQuery)),
        );
      } else {
        setFilteredProfiles(
          (profiles || [])
            .filter(p =>
              profilesToExclude
                ? !profilesToExclude.map(m => m.id).includes(p.id)
                : true,
            )
            ?.filter(profile => profile.id !== currentProfile?.id),
        );
      }
    }, [searchQuery, profiles, currentProfile, profilesToExclude]);

    const handleSelectProfile = (profile: PublicProfile) => {
      setSelectedProfiles(prev =>
        prev.includes(profile)
          ? prev.filter(p => p !== profile)
          : [...prev, profile],
      );
      if (single) {
        onSelect?.([profile]);
        resetStates();
        bottomSheetClose(ref);
      }
    };

    const handleConfirm = async () => {
      try {
        if (selectType === 'sync') {
          onSelect?.(selectedProfiles);
        } else {
          setLoading(true);
          await asynOnSelect?.(selectedProfiles);
          Toast.show({
            type: 'success',
            text1: t('common.members.addSuccess'),
          });
        }
        resetStates();
        bottomSheetClose(ref);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: t('common.members.addError'),
        });
      } finally {
        setLoading(false);
      }
    };

    return (
      <BaseSheet ref={ref}>
        <View className="flex-1 p-4 relative">
          {isLoading && <ActivityIndicator size={'small'} />}

          <View className="w-full">
            <ThemedText className="text-center text-xl font-semibold mb-6">
              {title}
            </ThemedText>
            <View className="flex-row items-center mb-4 w-full">
              <View className="rounded-l-md bg-surface p-3">
                <SearchIcon size={24} className="text-muted-foreground" />
              </View>
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('profile.search.placeholder')}
                className="rounded-r-md rounded-l-none flex-1"
              />
            </View>
          </View>

          {!isLoading && (
            <ScrollView
              className="flex-1 max-h-[65vh]"
              contentContainerStyle={{paddingBottom: 120}}
              keyboardShouldPersistTaps="handled">
              {selectedProfiles.length > 0 && (
                <View className="flex-row gap-2 flex-wrap mb-4">
                  {selectedProfiles.map(profile => (
                    <MiniProfileCard
                      key={profile.id}
                      profile={profile}
                      onPress={() => handleSelectProfile(profile)}
                    />
                  ))}
                </View>
              )}

              {filteredProfiles?.map(profile => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  actionType="select"
                  handleSelectProfile={() => handleSelectProfile(profile)}
                  rightComponent={
                    selectedProfiles.includes(profile) ? (
                      <View className="items-center justify-center">
                        <CheckIcon className="text-foreground" />
                      </View>
                    ) : null
                  }
                />
              ))}

              {filteredProfiles?.length === 0 && (
                <ThemedText className="text-center text-muted-foreground">
                  {t('profile.search.noResults')}
                </ThemedText>
              )}
            </ScrollView>
          )}

          {!single && (
            <View className="absolute bottom-0 left-0 right-0 p-4 bg-background">
              <SheetFooter
                onCancel={() => {
                  resetStates();
                  bottomSheetClose(ref);
                }}
                onConfirm={handleConfirm}
                disabled={loading || selectedProfiles.length === 0}
                confirmText={
                  loading ? t('common.members.adding') : t('common.actions.add')
                }
              />
            </View>
          )}
        </View>
      </BaseSheet>
    );
  },
);
