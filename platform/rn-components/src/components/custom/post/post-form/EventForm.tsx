import React, { useCallback, useRef } from 'react';
import { Form, FormCheckbox, FormField, FormInput } from '~/components/ui/form';
import { ThemedText } from '~/components/ui/themed-text';
import { ThemedView } from '~/components/ui/themed-view';
import { ProfileInput } from '../../common/profile-input';
import { XIcon } from 'lucide-react-native';
import { Image, Pressable } from 'react-native';
import { View } from 'react-native';
import { CalendarIcon, ChevronDownIcon } from '~/components/icons';
import { CameraIcon } from 'lucide-react-native';
import {
  MediaAttachment,
  PostCreationData,
  PublicProfile,
  RecurrenceFreq,
  RecurrenceWeekday,
} from '@openpeepshq/common';
import {
  parseEventMaxAttendeesInput,
  previewUpcomingOccurrences,
  weekdayFromDate,
} from '@openpeepshq/common/lib';
import { UseFormReturn } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { VisibilityInput } from './VisibilityInput';
import { useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { truncateText } from '~/lib/utils';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  EventDescriptionSheet,
  ImagePickerSheet,
  TimeZoneSelectorSheet,
} from '../../modals';
import { useWatch } from 'react-hook-form';
import { Checkbox } from '~/components/ui/checkbox';
import { DateSheet } from '../../modals/post/date-sheet';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import timezones from 'timezones-list';
import { BASE_URL } from '~/lib/constants';

export const EventForm = ({
  form,
  isEdit = false,
}: {
  form: UseFormReturn<PostCreationData>;
  isEdit?: boolean;
}) => {
  const { t } = useTranslation();
  const { currentProfile, openpeepsApi } = useOpenpeeps();
  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const [isBackgroundChanged, setIsBackgroundChanged] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [headerImage, setHeaderImage] = useState('');
  const [moderators, setModerators] = useState<PublicProfile[]>([]);
  const descriptionRef = useRef<BottomSheetModal>(null);
  const headerImagePickerModalRef = useRef<BottomSheetModal>(null);
  const startDateSheetModalRef = useRef<BottomSheetModal>(null);
  const endDateSheetModalRef = useRef<BottomSheetModal>(null);
  const timezoneSheetModalRef = useRef<BottomSheetModal>(null);
  const [eventFormats, setEventFormats] = useState([
    { value: 'jam', label: t('events.form.jamFormatLabel') },
    { value: 'external', label: t('events.form.externalFormatLabel') },
    { value: 'in-person', label: t('events.form.inPersonFormatLabel') },
  ]);
  const [eventFormat, setEventFormat] = useState<string>();
  const handleHeaderModalPress = useCallback(() => {
    headerImagePickerModalRef.current?.present();
  }, []);

  const handleDescriptionModalPress = useCallback(() => {
    descriptionRef.current?.present();
  }, []);

  const handleStartDateModal = React.useCallback(() => {
    startDateSheetModalRef.current?.present();
  }, []);

  const handleEnddDateModal = React.useCallback(() => {
    endDateSheetModalRef.current?.present();
  }, []);

  const handleTimezoneModalPress = useCallback(() => {
    timezoneSheetModalRef.current?.present();
  }, []);

  const description = useWatch({
    control: form.control,
    name: 'data.content',
  });

  const start = useWatch({
    control: form.control,
    name: 'data.start',
  });

  const end = useWatch({
    control: form.control,
    name: 'data.end',
  });
  const timeZone = useWatch({
    control: form.control,
    name: 'data.timeZone',
  });
  const recurrence = useWatch({
    control: form.control,
    name: 'data.recurrence',
  });
  const eventData = useWatch({
    control: form.control,
    name: 'data',
  });

  const handleHeaderImageSelect = useCallback(
    (image: MediaAttachment[]) => {
      setHeaderImage(image[0].previewUrl || image[0].url);
      form.setValue('data.image', image[0].previewUrl || image[0].url);
      setIsBackgroundChanged(true);
    },
    [form]
  );

  const maybeSwitchEventFormat = (value: string) => {
    if (eventFormat === value) {
      return;
    }
    setEventFormat(value);
    if (eventFormat === 'jam') {
      form.setValue('data.jam.type', 'video-call');
      form.setValue('data.jam.moderators', [currentProfile?.id as string]);
      form.setValue('data.jam.videoEnabled', true);
      form.setValue('data.jam.speakers', []);
      form.setValue('data.jam.presenters', []);
      form.setValue('data.physicalLocation', undefined);
      form.setValue('data.url', BASE_URL);
    } else if (eventFormat === 'external') {
      form.setValue('data.jam', undefined);
      form.setValue('data.physicalLocation', undefined);
      form.setValue('data.url', '');
    } else if (eventFormat === 'in-person') {
      form.setValue('data.jam', undefined);
      form.setValue('data.physicalLocation.text', '');
      form.setValue('data.url', '');
    }
  };

  useEffect(() => {
    if (serverInfo?.jams.livekit.enabled) {
      setEventFormats([
        { value: 'jam', label: t('events.form.jamFormatLabel') },
        { value: 'external', label: t('events.form.externalFormatLabel') },
        { value: 'in-person', label: t('events.form.inPersonFormatLabel') },
      ]);
    } else {
      setEventFormats([
        { value: 'external', label: t('events.form.externalFormatLabel') },
        { value: 'in-person', label: t('events.form.inPersonFormatLabel') },
      ]);
    }
    form.setValue(
      'data.jam.moderators',
      moderators.map((m) => m.id)
    );
    if (form.getValues('data.end')) {
      setShowEndDate(true);
    }

    if (form.getValues('data.physicalLocation')) {
      setEventFormat('in-person');
    } else if (form.getValues('data.jam')) {
      setEventFormat('jam');
    } else if (form.getValues('data.url')) {
      setEventFormat('external');
    }
  }, [moderators, form, serverInfo, t]);

  return (
    <Form {...form}>
      <ThemedView className="w-full relative rounded-md aspect-video overflow-hidden">
        <View className="w-full h-full flex justify-end items-end relative ">
          {isBackgroundChanged ? (
            <View className="flex flex-row gap-x-2 z-30 mb-6 mr-6">
              <Pressable
                className="bg-black/40 p-2 rounded-full"
                onPress={() => {
                  handleHeaderModalPress();
                  setIsBackgroundChanged(false);
                }}
              >
                <CameraIcon className="text-foreground" />
              </Pressable>
              <Pressable
                onPress={() => {
                  setHeaderImage('');
                  setIsBackgroundChanged(false);
                }}
                className="bg-black/40 p-2 rounded-full"
              >
                <XIcon className="text-foreground" />
              </Pressable>
            </View>
          ) : (
            <View className="flex flex-row gap-x-2 z-30 mb-6 mr-6">
              <Pressable
                className="bg-black/40 p-2 rounded-full"
                onPress={() => {
                  handleHeaderModalPress();
                  setIsBackgroundChanged(false);
                }}
              >
                <CameraIcon className="text-foreground" />
              </Pressable>
            </View>
          )}

          <Image
            source={
              isBackgroundChanged
                ? { uri: headerImage }
                : require('~/assets/images/event-placeholder.png')
            }
            className="w-full h-full rounded-md object-bottom absolute top-0"
            resizeMode="cover"
          />
        </View>
      </ThemedView>
      <ThemedText className="mb-4 tracking-wider">
        The ideal aspect ratio for uploaded image is 16:9
      </ThemedText>
      <ThemedText className="mt-4 text-xl font-semibold tracking-wider">
        {t('events.form.title')}
      </ThemedText>
      <ThemedView className="relative w-full mt-2">
        <FormField
          control={form.control}
          name="data.name"
          render={({ field }) => (
            <FormInput
              label="Event name"
              placeholder=""
              {...field}
              value={field.value || ''}
              className="rounded-md w-full"
              autoCapitalize="none"
            />
          )}
        />
      </ThemedView>
      <ThemedText className="mt-4 text-muted-foreground">
        {t('events.form.description')}
      </ThemedText>
      <ThemedView className="relative w-full mt-4">
        <ThemedText className="">Description</ThemedText>
        <Pressable
          onPress={handleDescriptionModalPress}
          className="relative w-full mt-2 border border-muted-foreground/40 rounded-md p-2"
        >
          <ThemedText className="py-2">
            {description
              ? truncateText(description, 60)
              : t('events.form.descriptionPlaceholder')}
          </ThemedText>
        </Pressable>
      </ThemedView>
      <View className="w-full h-[0.5px] bg-foreground/20 mt-6" />
      <ThemedText className="mt-4 text-xl font-semibold tracking-wider">
        {t('events.form.dateAndTimeTitle')}
      </ThemedText>
      <ThemedView className="relative w-full mt-4">
        <ThemedText className="">{t('events.form.startDate')}</ThemedText>
        <Pressable
          onPress={handleStartDateModal}
          className="relative w-full mt-2 border border-muted-foreground/40 rounded-md py-4 px-2 flex-row gap-x-2 items-center"
        >
          <CalendarIcon className="text-muted-foreground" size={18} />
          <ThemedText className="">
            {start
              ? new Date(start || '').toLocaleString('en-US')
              : t('events.form.startDate')}
          </ThemedText>
        </Pressable>
      </ThemedView>
      <ThemedView className="relative w-full mt-4 flex-row gap-x-4 items-center">
        <Checkbox
          checked={showEndDate}
          onCheckedChange={() => {
            setShowEndDate(!showEndDate);
          }}
        />
        <ThemedText className="">{t('events.form.addEndDate')}</ThemedText>
      </ThemedView>
      {showEndDate && (
        <ThemedView className="relative w-full mt-4">
          <ThemedText className="">{t('events.form.endDate')}</ThemedText>
          <Pressable
            onPress={handleEnddDateModal}
            className="relative w-full mt-2 border border-muted-foreground/40 rounded-md py-4 px-2 flex-row gap-x-2 items-center"
          >
            <CalendarIcon className="text-muted-foreground" size={18} />
            <ThemedText className="">
              {end
                ? new Date(end || '').toLocaleString('en-US')
                : t('events.form.endDate')}
            </ThemedText>
          </Pressable>
        </ThemedView>
      )}
      <ThemedView className="relative w-full mt-4">
        <ThemedText className="">{t('events.form.timezone')}</ThemedText>
        <Pressable
          onPress={handleTimezoneModalPress}
          className="relative w-full mt-2 border border-muted-foreground/40 rounded-md py-4 px-2 flex-row justify-between items-center"
        >
          <ThemedText className="">
            {timeZone
              ? timezones.find((tz) => tz.tzCode === timeZone)?.label
              : t('events.form.timezonePlaceholder')}
          </ThemedText>
          <ChevronDownIcon className="text-muted-foreground" size={18} />
        </Pressable>
      </ThemedView>
      <ThemedView className="relative w-full mt-4">
        <ThemedText>{t('events.form.repeat.title')}</ThemedText>
        <RadioGroup
          value={recurrence?.freq ?? 'none'}
          onValueChange={(value: string) => {
            if (value === 'none') {
              form.setValue('data.recurrence', undefined);
              return;
            }
            const freq = value as RecurrenceFreq;
            form.setValue('data.recurrence', {
              freq,
              interval: recurrence?.interval,
              until: recurrence?.until,
              count: recurrence?.count,
              byDay:
                freq === 'WEEKLY'
                  ? recurrence?.byDay?.length
                    ? recurrence.byDay
                    : start
                      ? [weekdayFromDate(new Date(start))]
                      : (['MO'] as RecurrenceWeekday[])
                  : undefined,
            });
          }}
        >
          <View>
            {(['none', 'DAILY', 'WEEKLY', 'MONTHLY'] as const).map((freq) => (
              <View key={freq} className="flex-row items-center gap-x-2 mt-2">
                <RadioGroupItem value={freq} id={`repeat-${freq}`} />
                <ThemedText>
                  {t(
                    freq === 'none'
                      ? 'events.form.repeat.none'
                      : `events.form.repeat.${freq.toLowerCase()}`
                  )}
                </ThemedText>
              </View>
            ))}
          </View>
        </RadioGroup>
      </ThemedView>
      {recurrence?.freq === 'WEEKLY' ? (
        <ThemedView className="relative w-full mt-4">
          <ThemedText>{t('events.form.repeat.weekdays')}</ThemedText>
          <View className="flex-row flex-wrap gap-2 mt-2">
            {(
              ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as RecurrenceWeekday[]
            ).map((day) => {
              const selected = recurrence.byDay?.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => {
                    const current = recurrence.byDay ?? [];
                    const next = selected
                      ? current.filter((value) => value !== day)
                      : [...current, day];
                    form.setValue('data.recurrence', {
                      ...recurrence,
                      byDay:
                        next.length > 0
                          ? next
                          : start
                            ? [weekdayFromDate(new Date(start))]
                            : ['MO'],
                    });
                  }}
                  className={`rounded-md border px-2 py-1 ${
                    selected ? 'bg-primary' : 'bg-background'
                  }`}
                >
                  <ThemedText
                    className={selected ? 'text-primary-foreground' : ''}
                  >
                    {t(`events.form.repeat.day.${day}`)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>
      ) : null}
      {recurrence ? (
        <ThemedView className="relative w-full mt-4">
          <ThemedText>{t('events.form.repeat.end')}</ThemedText>
          <RadioGroup
            value={
              recurrence.until ? 'until' : recurrence.count ? 'count' : 'never'
            }
            onValueChange={(value: string) => {
              if (value === 'never') {
                form.setValue('data.recurrence', {
                  ...recurrence,
                  until: undefined,
                  count: undefined,
                });
              } else if (value === 'until') {
                form.setValue('data.recurrence', {
                  ...recurrence,
                  count: undefined,
                  until:
                    recurrence.until ??
                    new Date(
                      Date.now() + 90 * 24 * 60 * 60 * 1000
                    ).toISOString(),
                });
              } else {
                form.setValue('data.recurrence', {
                  ...recurrence,
                  until: undefined,
                  count: recurrence.count ?? 10,
                });
              }
            }}
          >
            <View>
              {(['never', 'until', 'count'] as const).map((mode) => (
                <View key={mode} className="flex-row items-center gap-x-2 mt-2">
                  <RadioGroupItem value={mode} id={`repeat-end-${mode}`} />
                  <ThemedText>
                    {t(
                      mode === 'never'
                        ? 'events.form.repeat.never'
                        : mode === 'until'
                          ? 'events.form.repeat.onDate'
                          : 'events.form.repeat.after'
                    )}
                  </ThemedText>
                </View>
              ))}
            </View>
          </RadioGroup>
          {recurrence.count ? (
            <FormField
              control={form.control}
              name="data.recurrence.count"
              render={({ field }) => (
                <FormInput
                  label={t('events.form.repeat.count')}
                  keyboardType="numeric"
                  value={String(field.value ?? 10)}
                  onChangeText={(text) =>
                    field.onChange(Math.max(1, Number(text) || 1))
                  }
                  className="rounded-md w-full mt-2"
                />
              )}
            />
          ) : null}
          {eventData?.type === 'event' && eventData.start ? (
            <ThemedText className="mt-2 text-muted-foreground">
              {t('events.form.repeat.preview', {
                dates: previewUpcomingOccurrences(eventData, 3)
                  .map((item) =>
                    new Date(item.start).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                  )
                  .join(', '),
              })}
            </ThemedText>
          ) : null}
        </ThemedView>
      ) : null}
      <View className="w-full h-[0.5px] bg-foreground/20 mt-6" />
      <ThemedText className="mt-4 text-xl font-semibold tracking-wider">
        {t('events.form.location')}
      </ThemedText>
      <ThemedView className="relative w-full mt-4">
        <ThemedText className="">{t('events.form.eventFormat')}</ThemedText>
        <RadioGroup
          value={eventFormat}
          onValueChange={(value: string) => {
            maybeSwitchEventFormat(value);
          }}
        >
          <View className="">
            {eventFormats.map((fmt) => (
              <View
                key={fmt.value}
                className="flex-row items-center gap-x-2 mt-2"
              >
                <RadioGroupItem value={fmt.value} id={fmt.value} />
                <ThemedText>{fmt.label}</ThemedText>
              </View>
            ))}
          </View>
        </RadioGroup>
      </ThemedView>
      {serverInfo?.jams.livekit.enabled && eventFormat === 'jam' ? (
        <>
          <ThemedView className="relative w-full mt-4">
            <ThemedText className="">
              {t('events.form.jamWaitingRoom')}
            </ThemedText>
            <FormField
              control={form.control}
              name="data.jam.waitingRoom"
              render={({ field }) => (
                // @ts-ignore
                <FormCheckbox
                  label={t('events.form.jamWaitingRoomDescription')}
                  {...field}
                  checked={field.value ?? false}
                  className="rounded-md w-full mt-2"
                  onCheckedChange={field.onChange}
                  handleOnLabelPress={() => {}}
                />
              )}
            />
          </ThemedView>
          <ThemedText className="mt-4 ">
            {t('events.form.jamModerators')}
          </ThemedText>
          <ThemedView className="relative w-full mt-2">
            <ProfileInput
              defaultProfiles={[currentProfile!]}
              profiles={moderators}
              setProfiles={setModerators}
              label={t('events.form.jamModeratorsDescription')}
            />
          </ThemedView>
        </>
      ) : eventFormat === 'external' ? (
        <ThemedView className="relative w-full mt-4">
          <FormField
            control={form.control}
            name="data.url"
            render={({ field }) => (
              <FormInput
                label={t('events.form.externalFormatLabel')}
                placeholder=""
                {...field}
                value={field.value || ''}
                className="rounded-md w-full"
                autoCapitalize="none"
              />
            )}
          />
        </ThemedView>
      ) : eventFormat === 'in-person' ? (
        <ThemedView className="relative w-full mt-4">
          <FormField
            control={form.control}
            name="data.physicalLocation.text"
            render={({ field }) => (
              <FormInput
                label={t('events.form.location')}
                placeholder=""
                {...field}
                value={field.value || ''}
                className="rounded-md w-full"
                autoCapitalize="none"
              />
            )}
          />
        </ThemedView>
      ) : null}
      <View className="w-full h-[0.5px] bg-foreground/20 mt-6" />
      <ThemedText className="mt-4 text-xl font-semibold tracking-wider">
        {t('events.form.visibility')}
      </ThemedText>
      <VisibilityInput
        disabled={isEdit}
        audienceSetting={form.getValues()}
        type="event"
        onChange={(audienceSetting) => {
          form.setValue('visibility', audienceSetting.visibility);
          form.setValue('groupId', audienceSetting.groupId);
          form.setValue('audience', audienceSetting.audience);
        }}
      />
      {/* <ThemedView className="relative w-full mt-2">
        <FormField
          control={form.control}
          name="data.jam.maxAudience"
          render={({field}) => (
            <FormInput
              label="Event name"
              placeholder=""
              {...field}
              value={field.value?.toString()}
              className="rounded-md w-full"
              autoCapitalize="none"
            />
          )}
        />
      </ThemedView> */}
      <ThemedView className="relative w-full mt-4">
        <FormField
          control={form.control}
          name="data.attendeeListPublic"
          render={({ field }) => (
            // @ts-ignore
            <FormCheckbox
              label={t('events.form.attendeeListPublic')}
              {...field}
              checked={field.value ?? false}
              className="rounded-md w-full"
              onCheckedChange={field.onChange}
              handleOnLabelPress={() => {}}
            />
          )}
        />
      </ThemedView>
      <ThemedView className="relative w-full mt-4">
        <FormField
          control={form.control}
          name="data.maxAttendees"
          render={({ field }) => (
            <View className="flex-row items-end gap-2">
              <View className="flex-1">
                <FormInput
                  label={t('events.form.maxAttendees')}
                  placeholder={t('events.form.maxAttendeesDescription')}
                  {...field}
                  value={field.value?.toString() ?? ''}
                  keyboardType="numeric"
                  className="rounded-md w-full"
                  onChangeText={(value: string) => {
                    field.onChange(parseEventMaxAttendeesInput(value));
                  }}
                />
              </View>
              {field.value != null ? (
                <Pressable
                  accessibilityLabel={t('events.form.clearMaxAttendees')}
                  onPress={() => field.onChange(undefined)}
                  className="border-muted-foreground/40 mb-1 rounded-md border p-3"
                >
                  <XIcon className="text-foreground" size={18} />
                </Pressable>
              ) : null}
            </View>
          )}
        />
      </ThemedView>
      <View className="mb-20" />
      <EventDescriptionSheet
        initialDescription={form.getValues('data.content')}
        ref={descriptionRef}
        onDone={(v) => {
          form.setValue('data.content', v);
        }}
      />
      <ImagePickerSheet
        ref={headerImagePickerModalRef}
        onSelect={handleHeaderImageSelect}
      />
      <DateSheet
        ref={startDateSheetModalRef}
        value={form.getValues('data.start')}
        onChange={(v) => {
          form.setValue('data.start', v);
        }}
        onClose={() => startDateSheetModalRef.current?.close()}
      />
      <DateSheet
        ref={endDateSheetModalRef}
        value={form.getValues('data.end')}
        onChange={(v) => {
          form.setValue('data.end', v);
        }}
        onClose={() => endDateSheetModalRef.current?.close()}
      />
      <TimeZoneSelectorSheet
        ref={timezoneSheetModalRef}
        initialTimeZone={timeZone}
        onDone={(v) => {
          form.setValue('data.timeZone', v);
        }}
      />
    </Form>
  );
};
