import React, { forwardRef, useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '../ui/themed-text';
import { PublicProfile } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { profileMatchesQuery } from '../../lib/utils';
import { CheckIcon, SearchIcon } from '../icons/index';
import { Input } from '../ui/input';
import { BaseSheet, SheetFooter } from '../custom/modals/common';
import Toast from 'react-native-toast-message';
import { MiniProfileCard, ProfileCard } from './ProfileCard';
import { useTranslation } from 'react-i18next';
import { useThemeOpacity } from '../../theme/useThemeOpacity';
import { bottomSheetClose } from '../../lib/bottom-sheet-ref';

interface ProfilePickerSheetProps {
  onSelect?: (profile: PublicProfile[]) => void;
  asynOnSelect?: (profile: PublicProfile[]) => Promise<void>;
  selectType?: 'async' | 'sync';
  title?: string;
  profilesToExclude?: PublicProfile[];
  initialProfiles?: PublicProfile[];
  editMode?: boolean;
  single?: boolean;
  onDismiss?: () => void;
  /** Extra predicate over the candidate list (e.g. hide federated accounts). */
  filter?: (profile: PublicProfile) => boolean;
}

export const ProfileSelector = forwardRef<
  BottomSheetModal,
  ProfilePickerSheetProps
>(
  (
    {
      onSelect,
      asynOnSelect,
      title,
      profilesToExclude,
      selectType = 'sync',
      initialProfiles,
      editMode = false,
      single = false,
      onDismiss,
      filter,
    },
    ref
  ) => {
    const { openpeepsApi, currentProfile } = useOpenpeeps();
    const [selectedProfiles, setSelectedProfiles] = useState<PublicProfile[]>(
      initialProfiles || []
    );
    const { data: profiles, isLoading } = openpeepsApi.useProfiles();
    const [filteredProfiles, setFilteredProfiles] = useState(profiles);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

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
            .filter((p) =>
              profilesToExclude
                ? !profilesToExclude.some((m) => m.id === p.id)
                : true
            )
            ?.filter((profile) => profile.id !== currentProfile?.id)
            ?.filter((profile) => profileMatchesQuery(profile, searchQuery))
            ?.filter((profile) => (filter ? filter(profile) : true))
        );
      } else {
        setFilteredProfiles(
          (profiles || [])
            .filter((p) =>
              profilesToExclude
                ? !profilesToExclude.map((m) => m.id).includes(p.id)
                : true
            )
            ?.filter((profile) => profile.id !== currentProfile?.id)
            ?.filter((profile) => (filter ? filter(profile) : true))
        );
      }
    }, [searchQuery, profiles, currentProfile, profilesToExclude, filter]);

    // NativeWind v4 can't apply `/N` opacity to CSS-variable colors, so the
    // selected-row tint is built inline from the theme color (issue #1666).
    // `secondary` is a near-white neutral in the RN palette (unlike web's
    // teal), so a `secondary` wash is invisible on a white sheet; the tint
    // uses `primary` at low opacity, matching web's brand-accent selection.
    const { background: tintBackground } = useThemeOpacity();

    // Compare by id, not object reference: callers re-seed `initialProfiles`
    // with fresh objects on every present, so reference equality would drop
    // the selection (issue #1666 review).
    const isSelected = (profile: PublicProfile) =>
      selectedProfiles.some((p) => p.id === profile.id);

    const handleSelectProfile = (profile: PublicProfile) => {
      setSelectedProfiles((prev) =>
        prev.some((p) => p.id === profile.id)
          ? prev.filter((p) => p.id !== profile.id)
          : [...prev, profile]
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
      } catch {
        Toast.show({
          type: 'error',
          text1: t('common.members.addError'),
        });
      } finally {
        setLoading(false);
      }
    };

    return (
      <BaseSheet ref={ref} stackBehavior="push" onDismiss={onDismiss}>
        <View className="flex-1 p-4 relative">
          {isLoading && <ActivityIndicator size={'small'} />}

          <View className="w-full">
            <ThemedText className="text-center text-xl font-semibold mb-6">
              {title ?? t('profile.selector.title')}
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
              contentContainerClassName="pb-[120px]"
              keyboardShouldPersistTaps="handled"
            >
              {selectedProfiles.length > 0 && (
                <View className="flex-row gap-2 flex-wrap mb-4">
                  {selectedProfiles.map((profile) => (
                    <MiniProfileCard
                      key={profile.id}
                      profile={profile}
                      onPress={() => handleSelectProfile(profile)}
                    />
                  ))}
                </View>
              )}

              {filteredProfiles?.map((profile) => {
                const selected = isSelected(profile);
                // Screen-reader copy is user-facing copy: compose the label
                // from a locale key instead of a hard-coded English fragment
                // (issue #1666 review S1).
                const rowLabel = selected
                  ? t('profile.selector.rowSelected', {
                      name: profile.displayName || `@${profile.handle}`,
                    })
                  : profile.displayName || `@${profile.handle}`;
                // Two overlapping press surfaces, on purpose: the full row is a
                // `Pressable` (the a11y element), but the left avatar+name column
                // is also `ProfileCard`'s inner `TouchableWithoutFeedback`. RN
                // hands a tap to the first responder that claims it, so a tap on
                // the left column hits the inner touchable and a tap on the right
                // (check-icon) region hits this Pressable — both call
                // `handleSelectProfile`, so exactly one toggle per tap. Do not
                // "simplify" away the inner touchable: it is the only tap target
                // over the card itself, and dropping it would strand the right
                // half of the row (issue #1666 review S3).
                return (
                  <Pressable
                    key={profile.id}
                    className="rounded-md"
                    style={
                      selected ? tintBackground('primary', 0.15) : undefined
                    }
                    accessibilityRole="button"
                    accessibilityLabel={rowLabel}
                    accessibilityState={{ selected }}
                    onPress={() => handleSelectProfile(profile)}
                  >
                    <ProfileCard
                      profile={profile}
                      actionType="select"
                      handleSelectProfile={() => handleSelectProfile(profile)}
                      rightComponent={
                        selected ? (
                          <View className="items-center justify-center pr-1">
                            <CheckIcon size={16} className="text-primary" />
                          </View>
                        ) : null
                      }
                    />
                  </Pressable>
                );
              })}

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
  }
);
