import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import timezones from 'timezones-list';
import type { PostCreationData } from '@openpeepshq/common';
import { parseEventMaxAttendeesInput } from '@openpeepshq/common/lib';
import {
  EVENT_WEEKDAYS,
  useEventForm,
  type RepeatEnd,
  type RepeatFreq,
} from '@openpeepshq/react';
import { CalendarIcon, ChevronDownIcon, XIcon } from '~/components/icons';
import { ImageInput } from '~/components/form/ImageInput';
import { TimeZoneSelect } from '~/components/form/TimeZoneSelect';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { ThemedText } from '~/components/ui/themed-text';
import { bottomSheetClose, bottomSheetPresent } from '~/lib/bottom-sheet-ref';
import { DateSheet } from './DateSheet';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { EventTypeSwitcher } from './EventTypeSwitcher';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import { VisibilitySelector } from './VisibilitySelector';

export interface EventFormProps {
  postData: PostCreationData;
  onChange: (data: PostCreationData) => void;
  isEdit?: boolean;
  occurrenceEdit?: boolean;
}

const REPEAT_FREQS: RepeatFreq[] = ['none', 'DAILY', 'WEEKLY', 'MONTHLY'];
const REPEAT_ENDS: RepeatEnd[] = ['never', 'until', 'count'];

const formatDate = (value: string | undefined, timeZone: string) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
      })
    : '';

const SectionTitle = ({ children }: { children: string }) => (
  <ThemedText className="text-lg">{children}</ThemedText>
);

const PickerField = ({
  label,
  value,
  placeholder,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: React.ReactNode;
  onPress: () => void;
}) => (
  <View className="gap-y-1">
    <Label nativeID={label}>{label}</Label>
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-x-2 rounded-md border border-input px-3 py-3"
    >
      {icon}
      <ThemedText className={value ? '' : 'text-muted-foreground'}>
        {value || placeholder}
      </ThemedText>
    </Pressable>
  </View>
);

export const EventForm = ({
  postData,
  onChange,
  isEdit = false,
  occurrenceEdit = false,
}: EventFormProps) => {
  const { t } = useTranslation();
  const startSheetRef = useRef<BottomSheetModal>(null);
  const endSheetRef = useRef<BottomSheetModal>(null);
  const untilSheetRef = useRef<BottomSheetModal>(null);
  const timeZoneSheetRef = useRef<BottomSheetModal>(null);
  const {
    event,
    eventTimeZone,
    showEndDate,
    repeatFreq,
    repeatEnd,
    preview,
    patchEvent,
    setEvent,
    setAudience,
    applyFreq,
    toggleWeekday,
    applyRepeatEnd,
    setRepeatUntil,
    setRepeatCount,
    toggleEndDate,
    setTimeZone,
  } = useEventForm(postData, onChange);

  const repeatLabel = (freq: RepeatFreq) =>
    freq === 'none'
      ? t('events.form.repeat.none')
      : t(`events.form.repeat.${freq.toLowerCase()}`);
  const repeatEndLabel = (mode: RepeatEnd) =>
    mode === 'never'
      ? t('events.form.repeat.never')
      : mode === 'until'
        ? t('events.form.repeat.onDate')
        : t('events.form.repeat.after');

  return (
    <View>
      <ImageInput
        usage="event-header-image"
        url={event.image}
        onChange={(image) => patchEvent({ image })}
        text={t('events.form.imageDescription')}
        specsText={t('events.form.imageSpecs')}
        className="aspect-video h-auto"
      />

      <View className="mt-4 gap-y-4 px-3">
        <SectionTitle>{t('events.form.title')}</SectionTitle>

        <View className="gap-y-1">
          <Label nativeID="event-name">{t('events.form.name')}</Label>
          <Input
            value={event.name ?? ''}
            onChangeText={(name) => patchEvent({ name })}
          />
        </View>
        <ThemedText className="text-sm text-muted-foreground">
          {t('events.form.description')}
        </ThemedText>

        <OpenpeepsMarkdownInput
          rows={6}
          maxLength={5000}
          value={event.content ?? ''}
          onChange={(content) => patchEvent({ content })}
          placeholder={t('events.form.descriptionPlaceholder')}
        />
        <ComposePreviewLinks content={event.content} />

        <SectionTitle>{t('events.form.dateAndTimeTitle')}</SectionTitle>

        <PickerField
          label={t('events.form.startDate')}
          value={formatDate(event.start, eventTimeZone)}
          placeholder={t('events.form.startDate')}
          icon={<CalendarIcon className="text-muted-foreground" size={18} />}
          onPress={() => bottomSheetPresent(startSheetRef)}
        />

        <Pressable
          onPress={() => toggleEndDate(!showEndDate)}
          className="flex-row items-center gap-x-3"
        >
          <Checkbox checked={showEndDate} onCheckedChange={toggleEndDate} />
          <ThemedText>{t('events.form.addEndDate')}</ThemedText>
        </Pressable>

        {showEndDate ? (
          <PickerField
            label={t('events.form.endDate')}
            value={formatDate(event.end, eventTimeZone)}
            placeholder={t('events.form.endDate')}
            icon={<CalendarIcon className="text-muted-foreground" size={18} />}
            onPress={() => bottomSheetPresent(endSheetRef)}
          />
        ) : null}

        <PickerField
          label={t('events.form.timezone')}
          value={
            timezones.find((tz) => tz.tzCode === eventTimeZone)?.label ??
            eventTimeZone
          }
          placeholder={t('events.form.timezonePlaceholder')}
          icon={<ChevronDownIcon className="text-muted-foreground" size={18} />}
          onPress={() => bottomSheetPresent(timeZoneSheetRef)}
        />

        {!occurrenceEdit ? (
          <>
            <View className="gap-y-1">
              <Label nativeID="event-repeat">
                {t('events.form.repeat.title')}
              </Label>
              <RadioGroup
                value={repeatFreq}
                onValueChange={(value) => applyFreq(value as RepeatFreq)}
              >
                {REPEAT_FREQS.map((freq) => (
                  <Pressable
                    key={freq}
                    onPress={() => applyFreq(freq)}
                    className="flex-row items-center gap-x-2 py-1"
                  >
                    <RadioGroupItem value={freq} />
                    <ThemedText>{repeatLabel(freq)}</ThemedText>
                  </Pressable>
                ))}
              </RadioGroup>
            </View>

            {event.recurrence?.freq === 'WEEKLY' ? (
              <View>
                <ThemedText className="mb-2 text-sm">
                  {t('events.form.repeat.weekdays')}
                </ThemedText>
                <View className="flex-row flex-wrap gap-2">
                  {EVENT_WEEKDAYS.map((day) => {
                    const selected = event.recurrence?.byDay?.includes(day);
                    return (
                      <Pressable
                        key={day}
                        onPress={() => toggleWeekday(day)}
                        className={`rounded-md border border-input px-2 py-1 ${
                          selected ? 'bg-primary' : 'bg-background'
                        }`}
                      >
                        <ThemedText
                          className={`text-sm ${
                            selected ? 'text-primary-foreground' : ''
                          }`}
                        >
                          {t(`events.form.repeat.day.${day}`)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {event.recurrence ? (
              <>
                <View className="gap-y-1">
                  <Label nativeID="event-repeat-end">
                    {t('events.form.repeat.end')}
                  </Label>
                  <RadioGroup
                    value={repeatEnd}
                    onValueChange={(value) =>
                      applyRepeatEnd(value as RepeatEnd)
                    }
                  >
                    {REPEAT_ENDS.map((mode) => (
                      <Pressable
                        key={mode}
                        onPress={() => applyRepeatEnd(mode)}
                        className="flex-row items-center gap-x-2 py-1"
                      >
                        <RadioGroupItem value={mode} />
                        <ThemedText>{repeatEndLabel(mode)}</ThemedText>
                      </Pressable>
                    ))}
                  </RadioGroup>
                </View>
                {repeatEnd === 'until' ? (
                  <PickerField
                    label={t('events.form.repeat.onDate')}
                    value={formatDate(event.recurrence.until, eventTimeZone)}
                    placeholder={t('events.form.repeat.onDate')}
                    icon={
                      <CalendarIcon
                        className="text-muted-foreground"
                        size={18}
                      />
                    }
                    onPress={() => bottomSheetPresent(untilSheetRef)}
                  />
                ) : null}
                {repeatEnd === 'count' ? (
                  <View className="gap-y-1">
                    <Label nativeID="event-repeat-count">
                      {t('events.form.repeat.count')}
                    </Label>
                    <Input
                      keyboardType="numeric"
                      value={String(event.recurrence.count ?? 10)}
                      onChangeText={setRepeatCount}
                    />
                  </View>
                ) : null}
                {preview.length > 0 ? (
                  <ThemedText className="text-sm text-muted-foreground">
                    {t('events.form.repeat.preview', {
                      dates: preview
                        .map((occurrence) =>
                          new Date(occurrence.start).toLocaleDateString(
                            undefined,
                            { weekday: 'short', month: 'short', day: 'numeric' }
                          )
                        )
                        .join(', '),
                    })}
                  </ThemedText>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        <SectionTitle>{t('events.form.location')}</SectionTitle>

        <EventTypeSwitcher event={event} isEdit={isEdit} onChange={setEvent} />

        <SectionTitle>{t('events.form.people')}</SectionTitle>

        <View className="gap-y-1">
          <Label nativeID="event-visibility">
            {t('events.form.visibility')}
          </Label>
          <ThemedText className="text-sm text-muted-foreground">
            {t('events.form.visibilityNotChangeable')}
          </ThemedText>
          <VisibilitySelector
            audienceSetting={postData}
            onChange={setAudience}
            disabled={isEdit}
            type="event"
            showDirect
          />
        </View>

        <Pressable
          onPress={() =>
            patchEvent({ attendeeListPublic: !event.attendeeListPublic })
          }
          className="flex-row items-center gap-x-3"
        >
          <Checkbox
            checked={event.attendeeListPublic ?? false}
            onCheckedChange={(attendeeListPublic) =>
              patchEvent({ attendeeListPublic })
            }
          />
          <ThemedText className="flex-1">
            {t('events.form.attendeeListPublic')}
          </ThemedText>
        </Pressable>

        <View className="gap-y-1">
          <Label nativeID="event-max-attendees">
            {t('events.form.maxAttendees')}
          </Label>
          <ThemedText className="text-sm text-muted-foreground">
            {t('events.form.maxAttendeesDescription')}
          </ThemedText>
          <View className="flex-row items-center gap-x-2">
            <Input
              className="flex-1"
              keyboardType="numeric"
              value={event.maxAttendees?.toString() ?? ''}
              onChangeText={(value) =>
                patchEvent({ maxAttendees: parseEventMaxAttendeesInput(value) })
              }
            />
            {event.maxAttendees != null ? (
              <Pressable
                accessibilityLabel={t('events.form.clearMaxAttendees')}
                onPress={() => patchEvent({ maxAttendees: undefined })}
                className="rounded-md border border-input p-3"
              >
                <XIcon className="text-foreground" size={18} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <DateSheet
        ref={startSheetRef}
        value={event.start}
        timeZone={eventTimeZone}
        onChange={(start) => patchEvent({ start })}
        onClose={() => bottomSheetClose(startSheetRef)}
      />
      <DateSheet
        ref={endSheetRef}
        value={event.end}
        timeZone={eventTimeZone}
        onChange={(end) => patchEvent({ end })}
        onClose={() => bottomSheetClose(endSheetRef)}
      />
      <DateSheet
        ref={untilSheetRef}
        value={event.recurrence?.until}
        timeZone={eventTimeZone}
        onChange={setRepeatUntil}
        onClose={() => bottomSheetClose(untilSheetRef)}
      />
      <TimeZoneSelect
        ref={timeZoneSheetRef}
        initialTimeZone={eventTimeZone}
        onDone={(timeZone) => {
          if (timeZone && timeZone !== eventTimeZone) setTimeZone(timeZone);
        }}
      />
    </View>
  );
};
