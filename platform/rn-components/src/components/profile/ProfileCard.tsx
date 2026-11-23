import React from 'react';
import {
  View,
  TouchableWithoutFeedback,
  Pressable,
  type AccessibilityRole,
  type AccessibilityState,
} from 'react-native';
import type { PublicProfile, Profile } from '@openpeepshq/common/types';
import { markdownPlainText } from '@openpeepshq/common/lib';
import { XIcon } from '../icons/index';
import { ThemedText } from '../ui/themed-text';
import { truncateText } from '../../lib/utils';
import { useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/types/index';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileAvatar } from './Avatar';
import { FollowUnfollowButton } from './FollowUnfollowButton';

export interface ProfileCardProps {
  profile: PublicProfile | Profile;
  /** When provided, clicking the card calls this instead of navigating. */
  onSelect?: (profile: PublicProfile | Profile) => void;
  showAction?: boolean;
  /** Custom action node rendered on the right of the card. */
  action?: React.ReactNode;
  actionType?: 'follow' | 'message' | 'unfollow' | 'link' | 'select';
  handleSelectProfile?: () => void;
  rightComponent?: React.ReactNode;
  /**
   * Drop the default bottom margin and horizontal padding for placements
   * that manage their own spacing (e.g. a bordered strip), mirroring web's
   * tight card-to-border spacing.
   */
  unspaced?: boolean;
  /**
   * Screen-reader identity for select (picker) rows, forwarded to the row's
   * touchable. Picker rows are sometimes rendered bare — no accessible
   * wrapper (the DM candidate list) — so the select-mode a11y travels with
   * the row instead of assuming a `ProfileSelector`-style wrapper
   * (issue #1666 round-10 review S1).
   */
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
}

export const ProfileCard = ({
  profile,
  onSelect,
  showAction = true,
  action,
  actionType = 'link',
  handleSelectProfile,
  rightComponent,
  unspaced = false,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
}: ProfileCardProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const handleGoToProfile = () => {
    navigation.navigate('Profile', {
      handle: profile.handle,
    });
  };

  const onPress = () => {
    if (actionType === 'select' && handleSelectProfile) {
      handleSelectProfile();
    }
    if (actionType !== 'select') {
      if (onSelect) {
        onSelect(profile);
      } else {
        handleGoToProfile();
      }
    }
  };

  const bio = markdownPlainText(profile.bio);

  // Picker rows (actionType="select") are a fixed single-line row —
  // `px-4 mb-1 py-1.5`, name + handle, no bio — so the avatar stays
  // vertically centered regardless of long-name content (issue #1666).
  const selectRow = actionType === 'select';

  // Select rows render two ways: wrapped in an accessible `Pressable`
  // (ProfileSelector — the wrapper carries the a11y, the inner touchable
  // must defer so screen readers see one element per row, issue #1666
  // review S2) or bare (the DM candidate list — the row must carry the
  // a11y itself, issue #1666 round-10 review S1). The caller's a11y props
  // pick the mode: present → the touchable is the accessible element;
  // absent → it defers to the wrapper.
  const hasRowA11y =
    accessibilityRole !== undefined ||
    accessibilityLabel !== undefined ||
    accessibilityState !== undefined;

  return (
    <View
      className={
        unspaced
          ? 'w-full flex-row items-center justify-between'
          : `w-full flex-row items-center justify-between px-4 ${
              selectRow ? 'mb-1 py-1.5' : 'mb-8'
            }`
      }
    >
      <TouchableWithoutFeedback
        accessible={selectRow ? hasRowA11y : undefined}
        accessibilityRole={
          selectRow && hasRowA11y ? accessibilityRole : undefined
        }
        accessibilityLabel={
          selectRow && hasRowA11y ? accessibilityLabel : undefined
        }
        accessibilityState={
          selectRow && hasRowA11y ? accessibilityState : undefined
        }
        onPress={onPress}
      >
        <View className="flex flex-row items-center gap-x-2 min-w-0 flex-1">
          <ProfileAvatar
            profile={profile}
            className={selectRow ? 'size-10' : 'size-16'}
          />
          <View className="min-w-0 flex-1">
            <ThemedText
              className={
                selectRow
                  ? 'text-base font-semibold truncate'
                  : 'text-lg font-semibold truncate'
              }
              numberOfLines={1}
            >
              {truncateText(profile.displayName, 18) || profile.handle}
            </ThemedText>
            {/* Round-2 plan (comment 22096) option B: the handle is a
                muted, smaller secondary line. Two equal-weight 16dp lines
                leave the 40dp avatar sitting on the seam between them —
                the "picture not aligned with the name" read the QA rounds
                kept reporting (issue #1666). */}
            <ThemedText
              className={
                selectRow
                  ? 'text-muted-foreground text-sm truncate'
                  : 'truncate'
              }
              numberOfLines={1}
            >
              @{profile.handle}
            </ThemedText>
            {bio && !selectRow ? (
              <ThemedText
                className="text-muted-foreground mt-1 text-sm"
                numberOfLines={2}
              >
                {truncateText(bio, 100)}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </TouchableWithoutFeedback>
      {action ? (
        <View className="flex-shrink-0">{action}</View>
      ) : rightComponent ? (
        <View className="flex-shrink-0">{rightComponent}</View>
      ) : showAction ? (
        <View className="flex-shrink-0">
          <FollowUnfollowButton profile={profile} compact />
        </View>
      ) : null}
    </View>
  );
};

interface MiniProfileCardProps {
  profile: PublicProfile;
  onPress?: (profile: PublicProfile) => void;
  showAction?: boolean;
}

export const MiniProfileCard = ({
  profile,
  onPress,
  showAction = true,
}: MiniProfileCardProps) => {
  return (
    <View className="flex flex-row items-center gap-x-2 rounded-md border border-border px-2 py-1.5">
      <ProfileAvatar profile={profile} className="size-3" />
      {/* text-xs: matches the web ProfileBadge label (issue #1666 review S4);
          an unstyled ThemedText here would render larger than the 12dp avatar. */}
      <ThemedText className="text-xs">
        {truncateText(profile.displayName, 10) || `@${profile.handle}`}
      </ThemedText>
      {showAction && (
        <Pressable onPress={() => onPress && onPress(profile)}>
          <XIcon size={16} className="text-foreground" />
        </Pressable>
      )}
    </View>
  );
};
