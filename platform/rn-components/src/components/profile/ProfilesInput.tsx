import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { PublicProfile } from '@openpeepshq/common';
import { UsersIcon } from '../icons/index';
import { ThemedText } from '../ui/themed-text';
import { bottomSheetPresent } from '../../lib/bottom-sheet-ref';
import { cn } from '../../lib/utils';
import { MiniProfileCard } from './ProfileCard';
import { ProfileSelector } from './ProfileSelector';

export type ProfilesInputProps = {
  value: PublicProfile[];
  onChange: (profiles: PublicProfile[]) => void;
  placeholder?: string;
  /** Profiles that cannot be picked (e.g. the current user). */
  banlist?: PublicProfile[];
  disabled?: boolean;
  className?: string;
  title?: string;
};

export const ProfilesInput = ({
  value,
  onChange,
  placeholder,
  banlist = [],
  disabled = false,
  className,
  title,
}: ProfilesInputProps) => {
  const { t } = useTranslation();
  const selectorRef = useRef<BottomSheetModal>(null);

  const removeProfile = (profileId: string) =>
    onChange(value.filter((profile) => profile.id !== profileId));

  return (
    <>
      <Pressable
        disabled={disabled}
        className={cn(
          'border border-border rounded-lg px-3 py-2 min-h-10 flex-row flex-wrap items-center gap-1',
          disabled && 'opacity-60',
          className
        )}
        onPress={() => bottomSheetPresent(selectorRef)}
      >
        {value.length === 0 ? (
          <View className="flex-row items-center gap-x-2">
            <UsersIcon size={16} className="text-muted-foreground" />
            <ThemedText className="text-muted-foreground text-sm">
              {placeholder ??
                t('profile.input.placeholder', {
                  defaultValue: 'Select profiles',
                })}
            </ThemedText>
          </View>
        ) : (
          value.map((profile) => (
            <MiniProfileCard
              key={profile.id}
              profile={profile}
              showAction={!disabled}
              onPress={disabled ? undefined : () => removeProfile(profile.id)}
            />
          ))
        )}
      </Pressable>

      <ProfileSelector
        ref={selectorRef}
        onSelect={(added) => onChange([...value, ...added])}
        selectType="sync"
        title={title}
        profilesToExclude={[...value, ...banlist]}
      />
    </>
  );
};
