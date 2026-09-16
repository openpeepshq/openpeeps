import {
  FEED_FORMAT_OPTIONS,
  type FeedFormat,
} from '@openpeepshq/common';
import { useOpenpeeps, useResolvedFeedFormat } from '@openpeepshq/react';
import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { GenericHeader } from '~/components/custom';
import { MainScreenProps } from '~/components/navigation/types';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { ThemedText } from '~/components/ui/themed-text';
import { ThemedView } from '~/components/ui/themed-view';

type FeedSettingsProps = MainScreenProps<'FeedSettings'>;

export const FeedSettings: React.FC<FeedSettingsProps> = () => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { data: profileSettings } = openpeepsApi.useCurrentProfileSettings();
  const updateProfileSettings =
    openpeepsApi.updateCurrentProfileSettingsAction();
  const { persisted, clearSessionFormat } = useResolvedFeedFormat();
  const [selectedFormat, setSelectedFormat] =
    useState<FeedFormat>(persisted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setSelectedFormat(persisted);
  }, [persisted]);

  const handleSubmit = async () => {
    if (!currentProfile?.id) {
      Toast.show({
        type: 'error',
        text1: t('settings.feed.updateError'),
      });
      return;
    }

    setIsSubmitting(true);
    updateProfileSettings({
      id: currentProfile.id,
      feedSettings: {
        ...profileSettings?.feedSettings,
        format: selectedFormat,
      },
    })
      .then(() => {
        clearSessionFormat();
        Toast.show({
          type: 'success',
          text1: t('settings.feed.updateSuccess'),
        });
      })
      .catch(() => {
        Toast.show({
          type: 'error',
          text1: t('settings.feed.updateError'),
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <ThemedSafeAreaView style={{ flex: 1 }}>
      <GenericHeader
        title={t('settings.feed.title')}
        rightButtonTitle={
          isSubmitting ? t('common.form.loading') : t('common.form.save')
        }
        onRightButtonPress={handleSubmit}
        rightButtonDisabled={isSubmitting}
      />
      <ThemedView style={{ flex: 1 }}>
        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className="w-full flex p-4"
        >
          <ThemedText className="text-lg text-muted-foreground mb-4">
            {t('settings.feed.feedDescription')}
          </ThemedText>
          <ThemedView className="gap-4 py-4 w-full rounded-md">
            <RadioGroup
              value={selectedFormat}
              onValueChange={(value) =>
                setSelectedFormat(value as FeedFormat)
              }
            >
              {FEED_FORMAT_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setSelectedFormat(option)}
                  className="py-3 mb-2 flex-row items-center gap-x-3"
                >
                  <RadioGroupItem value={option} />
                  <ThemedText className="text-lg">
                    {t(`feed.format.${option}`)}
                  </ThemedText>
                </Pressable>
              ))}
            </RadioGroup>
          </ThemedView>
        </KeyboardAwareScrollView>
      </ThemedView>
    </ThemedSafeAreaView>
  );
};
