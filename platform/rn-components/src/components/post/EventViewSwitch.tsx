import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EVENT_VIEW_OPTIONS, useEventView } from '@openpeepshq/react';
import { ThemedText } from '~/components/ui/themed-text';
import { cn } from '~/lib/utils';

export const EventViewSwitch = () => {
  const { t } = useTranslation();
  const { view, setView } = useEventView();

  return (
    <View className="mb-3 flex-row justify-end px-4">
      <View className="flex-row border border-border rounded-md overflow-hidden">
        {EVENT_VIEW_OPTIONS.map((option) => (
          <Pressable
            key={option}
            accessibilityState={{ selected: view === option }}
            className={cn(
              'px-3 py-1',
              view === option ? 'bg-primary' : 'bg-background'
            )}
            onPress={() => setView(option)}
          >
            <ThemedText
              className={cn(
                'text-sm',
                view === option
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {t(`events.feed.view.${option}`, {
                defaultValue: option === 'list' ? 'List' : 'Calendar',
              })}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
};
