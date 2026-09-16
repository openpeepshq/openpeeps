import { FEED_FORMAT_OPTIONS, type FeedFormat } from '@openpeepshq/common';
import { useResolvedFeedFormat } from '@openpeepshq/react';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '~/components/ui/themed-text';
import { cn } from '~/lib/utils';

export const FeedFormatSwitch = () => {
  const { t } = useTranslation();
  const { format, setSessionFormat } = useResolvedFeedFormat();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('feed.format.switchLabel')}
      className="flex-row justify-end px-3 py-2"
    >
      <View className="flex-row overflow-hidden rounded-md border border-border">
        {FEED_FORMAT_OPTIONS.map((option) => {
          const selected = format === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setSessionFormat(option as FeedFormat)}
              className={cn(
                'px-3 py-1',
                selected ? 'bg-primary' : 'bg-background',
              )}
            >
              <ThemedText
                className={cn(
                  'text-sm',
                  selected
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {t(`feed.format.${option}`)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};
