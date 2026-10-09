import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Event, Location } from '@openpeepshq/common';
import { useEventTypeSwitcher, useLocationSearch } from '@openpeepshq/react';
import { Checkbox } from '../../ui/checkbox';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { ThemedText } from '../../ui/themed-text';
import { BASE_URL } from '../../../lib/constants';
import { ProfilesInput } from '../../profile/ProfilesInput';

export type { EventFormat } from '@openpeepshq/react';

export interface EventTypeSwitcherProps {
  event: Event;
  isEdit?: boolean;
  onChange: (event: Event) => void;
}

const SimpleLocationInput = ({
  value,
  onChange,
}: {
  value?: Location;
  onChange: (location: Location | undefined) => void;
}) => {
  const { t } = useTranslation();
  const { text, setText, suggestions, clearSuggestions, search } =
    useLocationSearch(value);

  return (
    <View className="gap-1">
      <Label nativeID="event-location">{t('events.form.location')}</Label>
      <Input
        value={text}
        placeholder={t('events.form.locationPlaceholder')}
        onChangeText={(next) => {
          setText(next);
          onChange({ text: next });
          search(next);
        }}
      />
      {suggestions.length > 0 ? (
        <View className="mt-1 rounded-md border border-border bg-background">
          {suggestions.map((item) => (
            <Pressable
              key={`${item.name}-${item.center.lat}-${item.center.lng}`}
              className="px-3 py-2"
              onPress={() => {
                setText(item.name);
                onChange({ text: item.name, coordinates: item.center });
                clearSuggestions();
              }}
            >
              <ThemedText className="text-sm">{item.name}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

export const EventTypeSwitcher = ({
  event,
  isEdit = false,
  onChange,
}: EventTypeSwitcherProps) => {
  const { t } = useTranslation();
  const {
    eventFormat,
    formats,
    livekitEnabled,
    switchFormat,
    moderatorProfiles,
    setModerators,
    setWaitingRoom,
    setUrl,
    setPhysicalLocation,
  } = useEventTypeSwitcher({ event, isEdit, onChange, origin: BASE_URL ?? '' });

  return (
    <View className="gap-3">
      <View>
        <Label nativeID="event-format">{t('events.form.eventFormat')}</Label>
        <RadioGroup
          value={eventFormat}
          onValueChange={(value) => switchFormat(value as typeof eventFormat)}
          className="mt-2 gap-2"
        >
          {formats.map((format) => (
            <Pressable
              key={format.value}
              disabled={format.value === 'jam' && !livekitEnabled}
              onPress={() => switchFormat(format.value)}
              className="flex-row items-center gap-2"
            >
              <RadioGroupItem
                value={format.value}
                disabled={format.value === 'jam' && !livekitEnabled}
              />
              <ThemedText>{format.label}</ThemedText>
            </Pressable>
          ))}
        </RadioGroup>
      </View>

      {eventFormat === 'in-person' ? (
        <SimpleLocationInput
          value={event.physicalLocation}
          onChange={setPhysicalLocation}
        />
      ) : null}

      {eventFormat === 'external' ? (
        <View className="gap-1">
          <Label nativeID="event-url">
            {t('events.form.externalFormatLabel')}
          </Label>
          <Input
            value={event.url ?? ''}
            placeholder={t('events.form.externalEventUrlPlaceholder')}
            autoCapitalize="none"
            keyboardType="url"
            onChangeText={setUrl}
          />
        </View>
      ) : null}

      {eventFormat === 'jam' ? (
        <>
          {!livekitEnabled ? (
            <ThemedText className="text-sm text-destructive">
              {t('jams.unavailable.message')}
            </ThemedText>
          ) : null}
          <View className="gap-2">
            <Label nativeID="event-moderators">
              {t('events.form.jamModerators')}
            </Label>
            <ProfilesInput
              value={moderatorProfiles}
              onChange={setModerators}
              disabled={!livekitEnabled}
              placeholder={t('events.form.jamModeratorsDescription')}
            />
          </View>
          <View className="flex-row items-center gap-2">
            <Checkbox
              checked={event.jam?.waitingRoom ?? false}
              disabled={!livekitEnabled}
              onCheckedChange={setWaitingRoom}
            />
            <ThemedText className="text-sm">
              {t('events.form.jamWaitingRoom')}
            </ThemedText>
          </View>
        </>
      ) : null}
    </View>
  );
};
