import React from 'react';
import { Pressable, View } from 'react-native';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { ThemedText } from '~/components/ui/themed-text';
import { cn } from '~/lib/utils';

export interface RadioSelectOption {
  title: string;
  description: string;
  value: string;
}

export interface RadioSelectProps {
  title?: string;
  description?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  options: RadioSelectOption[];
}

export const RadioSelect = ({
  title = '',
  description,
  disabled = false,
  value,
  onChange,
  options,
}: RadioSelectProps) => (
  <View className={cn('flex-col gap-y-2 px-4', disabled && 'opacity-50')}>
    {title ? (
      <ThemedText className="text-lg font-medium">{title}</ThemedText>
    ) : null}
    {description ? <ThemedText>{description}</ThemedText> : null}
    <RadioGroup
      value={value ?? ''}
      onValueChange={(next) => onChange?.(next)}
      disabled={disabled}
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          disabled={disabled}
          onPress={() => onChange?.(option.value)}
          className="flex-row gap-x-2 py-1"
        >
          <RadioGroupItem value={option.value} className="mt-1" />
          <View className="flex-1 gap-y-1">
            <ThemedText className="font-medium">{option.title}</ThemedText>
            <ThemedText className="text-muted-foreground text-sm">
              {option.description}
            </ThemedText>
          </View>
        </Pressable>
      ))}
    </RadioGroup>
  </View>
);
