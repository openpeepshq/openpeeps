import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Text } from '../../../ui/text';
import { Switch } from '../../../ui/switch';
import { RadioGroup, RadioGroupItem } from '../../../ui/radio-group';
import { BaseSheet } from '../common';
import { useTranslation } from 'react-i18next';

type messageRequestType = 'no-one' | 'everyone';

interface ConversationSettingsSheetProps {
  onMessageRequestChange?: (value: messageRequestType) => void;
  onReadReceiptsChange?: (value: boolean) => void;
}

export const ConversationSettingsSheet = forwardRef<
  BottomSheetModal,
  ConversationSettingsSheetProps
>(({ onMessageRequestChange, onReadReceiptsChange }, ref) => {
  const [messageRequests, setMessageRequests] =
    React.useState<messageRequestType>('everyone');
  const [readReceipts, setReadReceipts] = React.useState(false);
  const { t } = useTranslation();

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1 px-5">
        <Text className="text-xl text-center font-semibold mb-6">
          {t('conversations.settings.title')}
        </Text>

        <View className="mb-6">
          <Text className="text-lg font-semibold mb-2">
            {t('conversations.settings.messageRequests.title')}
          </Text>
          <Text className="text-base text-muted-foreground mb-4">
            {t('conversations.settings.messageRequests.description')}
          </Text>

          <RadioGroup
            value={messageRequests}
            onValueChange={(value: string) => {
              setMessageRequests(value as messageRequestType);
              onMessageRequestChange?.(value as messageRequestType);
            }}>
            <View className="flex-row items-center space-x-2 mb-4">
              <RadioGroupItem value="everyone" id="everyone" />
              <Text>{t('conversations.settings.messageRequests.everyone')}</Text>
            </View>
            <View className="flex-row items-center space-x-2">
              <RadioGroupItem value="no-one" id="no-one" />
              <Text>{t('conversations.settings.messageRequests.noOne')}</Text>
            </View>
          </RadioGroup>
        </View>

        <View>
          <Text className="text-lg font-semibold mb-2">
            {t('conversations.settings.title')}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-muted-foreground">
              {t('conversations.settings.messageRequests.description')}
            </Text>
            <Switch
              checked={readReceipts}
              onCheckedChange={checked => {
                setReadReceipts(checked);
                onReadReceiptsChange?.(checked);
              }}
            />
          </View>
        </View>
      </View>
    </BaseSheet>
  );
});
