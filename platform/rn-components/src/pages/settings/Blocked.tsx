import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOpenpeeps } from '@openpeepshq/react';
import type { PublicProfile } from '@openpeepshq/common';
import { MainScreenProps } from '../../components/navigation/types/index';
import { useSetPageHeader } from '../../components/layout';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';
import { Button } from '../../components/ui/button';

type BlockedSettingsProps = MainScreenProps<'BlockedSettings'>;

export const BlockedSettings: React.FC<BlockedSettingsProps> = () => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const blockedQuery = openpeepsApi.useBlockedProfiles();
  const currentQuery = openpeepsApi.useCurrentProfile();
  const profiles = blockedQuery.data ?? [];

  useSetPageHeader(t('settings.blocked.title'));

  return (
    <ThemedView className="flex-1">
      <ThemedView className="flex-1 p-4">
        <ThemedText className="text-muted-foreground mb-4">
          {t('settings.blocked.description')}
        </ThemedText>
        {profiles.length === 0 ? (
          <ThemedText className="text-muted-foreground">
            {t('settings.blocked.empty')}
          </ThemedText>
        ) : (
          profiles.map((profile) => (
            <BlockedRow
              key={profile.id}
              profile={profile}
              onUnblocked={() => {
                void blockedQuery.refetch();
                void currentQuery.refetch();
              }}
            />
          ))
        )}
      </ThemedView>
    </ThemedView>
  );
};

const BlockedRow = ({
  profile,
  onUnblocked,
}: {
  profile: PublicProfile;
  onUnblocked: () => void;
}) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const unblockProfile = openpeepsApi.unblockProfileAction({ id: profile.id });

  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-1 pr-3">
        <ThemedText className="font-semibold">
          {profile.displayName || profile.handle}
        </ThemedText>
        <ThemedText className="text-muted-foreground">
          @{profile.handle}
        </ThemedText>
      </View>
      <Button
        variant="outline"
        onPress={() => {
          void unblockProfile(undefined).then(onUnblocked);
        }}
      >
        <ThemedText>{t('profile.block.unblock')}</ThemedText>
      </Button>
    </View>
  );
};
