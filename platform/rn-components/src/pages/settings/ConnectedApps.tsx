import React from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { oauthScopeLabelKey, useConnectedApps } from '@openpeepshq/react';
import { useSetPageHeader } from '../../components/layout';
import { MainScreenProps } from '../../components/navigation/types/index';
import { Button } from '../../components/ui/button';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';

type ConnectedAppsSettingsProps = MainScreenProps<'ConnectedAppsSettings'>;

export const ConnectedAppsSettings: React.FC<
  ConnectedAppsSettingsProps
> = () => {
  const { t } = useTranslation();
  const { grants, revoke } = useConnectedApps();

  useSetPageHeader(t('settings.connectedApps.title'));

  return (
    <ThemedView className="flex-1">
      <ScrollView contentContainerClassName="gap-3 p-4">
        <ThemedText className="text-sm text-muted-foreground">
          {t('settings.connectedApps.description')}
        </ThemedText>
        {grants.length === 0 ? (
          <ThemedText className="text-sm text-muted-foreground">
            {t('settings.connectedApps.empty')}
          </ThemedText>
        ) : (
          grants.map((grant) => (
            <View
              key={grant.clientId}
              className="rounded-md border border-border p-3"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <ThemedText className="font-semibold">
                    {grant.clientName}
                  </ThemedText>
                  <ThemedText className="mt-1 text-xs text-muted-foreground">
                    {t('settings.connectedApps.since', {
                      date: new Date(grant.createdAt).toLocaleDateString(),
                    })}
                  </ThemedText>
                </View>
                <Button
                  variant="outline"
                  onPress={() => void revoke(grant.clientId)}
                >
                  <ThemedText>{t('settings.connectedApps.revoke')}</ThemedText>
                </Button>
              </View>
              <View className="mt-2 gap-1">
                {grant.scopes.map((scope) => (
                  <ThemedText
                    key={scope}
                    className="text-xs text-muted-foreground"
                  >
                    {`• ${t(oauthScopeLabelKey(scope), { defaultValue: scope })}`}
                  </ThemedText>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
};
