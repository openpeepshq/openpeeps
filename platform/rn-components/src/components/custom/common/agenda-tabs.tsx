import React from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '~/components/ui/themed-text';
import { cn } from '~/lib/utils';

export type AgendaTab<T extends string> = { value: T; label: string };

/** Underlined tab strip used by the event pages (web `TabButton` row). */
export const AgendaTabs = <T extends string>({
  tabs,
  value,
  onChange,
  accessibilityLabel,
}: {
  tabs: AgendaTab<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) => (
  <View
    accessibilityRole="tablist"
    accessibilityLabel={accessibilityLabel}
    className="flex-row border-b border-border"
  >
    {tabs.map((tab) => {
      const active = tab.value === value;
      return (
        <Pressable
          key={tab.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          onPress={() => onChange(tab.value)}
          className={cn('px-4 py-2', active && 'border-b-2 border-primary')}
        >
          <ThemedText
            className={cn(
              'text-sm',
              active ? 'font-semibold' : 'text-muted-foreground'
            )}
          >
            {tab.label}
          </ThemedText>
        </Pressable>
      );
    })}
  </View>
);
