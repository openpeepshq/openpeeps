import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { useCalendarFeedLink } from '@openpeepshq/react';
import { useSetPageHeader } from '../../components/layout';
import { CopyIcon } from '../../components/icons/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { Button } from '../../components/ui/button';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';

type CalendarFeedSettingsProps = MainScreenProps<'CalendarFeedSettings'>;

export const CalendarFeedSettings: React.FC<CalendarFeedSettingsProps> = () => {
  const { t } = useTranslation();
  const { feedUrl, creating, revoking, status, createLink, revokeLink } =
    useCalendarFeedLink();

  React.useEffect(() => {
    if (!status) return;
    Toast.show({ type: status.type, text1: status.message });
  }, [status]);

  useSetPageHeader(t('settings.calendarFeed.title'));

  return (
    <ThemedView className="flex-1">
      <ThemedView className="flex-1 p-4 gap-3">
        <ThemedText className="text-lg font-medium">
          {t('settings.calendarFeed.introTitle')}
        </ThemedText>
        <ThemedText className="text-sm text-muted-foreground">
          {t('settings.calendarFeed.introDescription')}
        </ThemedText>

        {feedUrl ? (
          <View className="gap-2 rounded-md border border-border p-3">
            <View className="flex-row items-start gap-2">
              <ThemedText className="flex-1 text-sm" selectable>
                {feedUrl}
              </ThemedText>
              <Button
                size="icon"
                variant="ghost"
                accessibilityLabel={t('settings.calendarFeed.copy')}
                onPress={() => Clipboard.setString(feedUrl)}
              >
                <CopyIcon size={16} className="text-foreground" />
              </Button>
            </View>
            <Button
              variant="outline"
              disabled={revoking}
              onPress={() => void revokeLink()}
            >
              <ThemedText>
                {revoking
                  ? t('settings.calendarFeed.deleting')
                  : t('settings.calendarFeed.delete')}
              </ThemedText>
            </Button>
          </View>
        ) : (
          <Button disabled={creating} onPress={() => void createLink()}>
            <ThemedText className="text-primary-foreground">
              {creating
                ? t('settings.calendarFeed.creating')
                : t('settings.calendarFeed.create')}
            </ThemedText>
          </Button>
        )}
      </ThemedView>
    </ThemedView>
  );
};
