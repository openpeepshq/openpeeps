import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GuestData } from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';
import { useJamContext, useOpenpeeps, useServerInfo } from '@openpeepshq/react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { ThemedText } from '~/components/ui/themed-text';
import { BASE_URL } from '~/lib/constants';

export const JamGuestForm = () => {
  const { t } = useTranslation();
  const serverInfo = useServerInfo();
  const { jamPost, jamEvent } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const guestPass = openpeepsApi.guestPassAction();

  const [guestData, setGuestData] = useState<GuestData>({
    displayName: '',
    email: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const termsLink =
    serverInfo.communityConfig?.info?.termsAndConditions ??
    `${BASE_URL}/docs/terms-and-conditions`;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await guestPass({
        ...guestData,
        resource: { type: 'jams', id: jamPost.id },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="w-full flex-1 items-center justify-center p-4">
      <View className="w-full max-w-md gap-4 rounded-md border border-border bg-card p-6">
        <View className="items-center">
          <ThemedText className="text-center text-xl font-semibold">
            {jamEvent.name} — {profileName(jamPost.profile)}
          </ThemedText>
          <ThemedText className="mt-2 text-sm text-muted-foreground">
            {t('jams.lobby.guestIntro')}
          </ThemedText>
        </View>

        <View className="gap-2">
          <Label nativeID="guest-name">
            {t('jams.lobby.guestFullNameLabel')}
          </Label>
          <Input
            aria-labelledby="guest-name"
            value={guestData.displayName}
            onChangeText={(displayName) =>
              setGuestData((d) => ({ ...d, displayName }))
            }
            placeholder={t('jams.lobby.guestFullNamePlaceholder')}
          />
        </View>

        <View className="gap-2">
          <Label nativeID="guest-email">
            {t('jams.lobby.guestEmailLabel')}
          </Label>
          <Input
            aria-labelledby="guest-email"
            value={guestData.email}
            onChangeText={(email) => setGuestData((d) => ({ ...d, email }))}
            placeholder={t('jams.lobby.guestEmailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <ThemedText className="text-sm text-muted-foreground">
          {t('jams.lobby.guestTermsAgreePrefix')}{' '}
          <ThemedText
            className="text-sm text-primary underline"
            onPress={() => void Linking.openURL(termsLink)}
          >
            {t('navigation.termsAndConditions')}
          </ThemedText>
          .
        </ThemedText>

        {error ? (
          <ThemedText className="rounded-md border border-destructive/40 p-2 text-sm text-destructive">
            {error}
          </ThemedText>
        ) : null}

        <Button
          onPress={() => void submit()}
          disabled={
            submitting ||
            !guestData.displayName.trim() ||
            !guestData.email.trim()
          }
          className="w-full"
        >
          <ThemedText className="text-primary-foreground">
            {submitting ? t('common.submitting') : t('jams.lobby.continue')}
          </ThemedText>
        </Button>
      </View>
    </View>
  );
};
