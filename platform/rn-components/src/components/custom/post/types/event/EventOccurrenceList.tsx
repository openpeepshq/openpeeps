import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { ExpandedOccurrence } from '@openpeepshq/common/lib';
import { sameRecurrenceId } from '@openpeepshq/common/lib';
import { ChevronDownIcon, ChevronRightIcon } from '~/components/icons';
import { ThemedText } from '~/components/ui/themed-text';
import { MainStackParamList } from '~/components/navigation/types';

export interface EventOccurrenceListProps {
  postId: string;
  occurrences: ExpandedOccurrence[];
  currentOccurrenceId?: string;
  recurrenceLabel: string;
}

const formatOccurrenceStart = (start: string) =>
  new Date(start).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const EventOccurrenceList: React.FC<EventOccurrenceListProps> = ({
  postId,
  occurrences,
  currentOccurrenceId,
  recurrenceLabel,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const goTo = (occurrence?: string) => {
    navigation.navigate('Post', { id: postId, occurrence });
  };

  if (occurrences.length === 0 && !currentOccurrenceId) {
    return (
      <View className="mt-4">
        <ThemedText className="text-muted-foreground text-sm">
          {t('events.repeat.label', { defaultValue: 'Repeats' })}
        </ThemedText>
        <ThemedText className="text-sm">{recurrenceLabel}</ThemedText>
      </View>
    );
  }

  return (
    <View className="mt-4">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        className="flex-row items-start gap-x-2"
      >
        {open ? (
          <ChevronDownIcon className="mt-0.5 text-foreground" size={16} />
        ) : (
          <ChevronRightIcon className="mt-0.5 text-foreground" size={16} />
        )}
        <View className="flex-1">
          <ThemedText className="text-muted-foreground text-sm">
            {t('events.repeat.label', { defaultValue: 'Repeats' })}
          </ThemedText>
          <ThemedText className="text-sm">{recurrenceLabel}</ThemedText>
          <ThemedText className="text-muted-foreground text-xs">
            {open
              ? t('events.occurrence.hideDates')
              : t('events.occurrence.showDates')}
          </ThemedText>
        </View>
      </Pressable>
      {open ? (
        <ScrollView
          nestedScrollEnabled
          style={{ maxHeight: 192 }}
          className="mt-2"
        >
          {currentOccurrenceId ? (
            <Pressable onPress={() => goTo(undefined)} className="px-2 py-2">
              <ThemedText className="text-sm">
                {t('events.occurrence.viewSeries')}
              </ThemedText>
            </Pressable>
          ) : null}
          {occurrences.map((occurrence) => {
            const current = sameRecurrenceId(
              occurrence.recurrenceId,
              currentOccurrenceId
            );
            const label = formatOccurrenceStart(occurrence.start);
            return (
              <Pressable
                key={occurrence.recurrenceId}
                disabled={current}
                onPress={() => goTo(occurrence.recurrenceId)}
                className={`px-2 py-2 ${current ? 'bg-muted rounded' : ''}`}
              >
                <ThemedText
                  className={`text-sm ${current ? 'font-semibold' : ''}`}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
};
