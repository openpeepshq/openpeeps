import { FEED_FORMAT_OPTIONS } from '@openpeepshq/common';
import { useFeedFormatPreference } from '@openpeepshq/react';
import React from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { HeaderActionButton, useSetPageHeader } from '../../components/layout';
import { MainScreenProps } from '../../components/navigation/types/index';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';

type FeedSettingsProps = MainScreenProps<'FeedSettings'>;

export const FeedSettings: React.FC<FeedSettingsProps> = () => {
  const { format, setFormat, submitting, save } = useFeedFormatPreference();
  const { t } = useTranslation();

  const handleSubmit = async () => {
    try {
      await save();
      Toast.show({
        type: 'success',
        text1: t('settings.feed.updateSuccess'),
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: t('settings.feed.updateError'),
      });
    }
  };

  useSetPageHeader(
    t('settings.feed.title'),
    <HeaderActionButton
      title={submitting ? t('common.form.loading') : t('common.form.save')}
      onPress={() => void handleSubmit()}
      disabled={submitting}
      loading={submitting}
    />
  );

  return (
    <ThemedView className="flex-1">
      <ThemedView className="flex-1">
        <KeyboardAwareScrollView
          contentContainerClassName="grow"
          className="w-full flex p-4"
        >
          <ThemedText className="text-lg text-muted-foreground mb-4">
            {t('settings.feed.feedDescription')}
          </ThemedText>
          <ThemedView className="gap-4 py-4 w-full rounded-md">
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as typeof format)}
            >
              {FEED_FORMAT_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setFormat(option)}
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
    </ThemedView>
  );
};
