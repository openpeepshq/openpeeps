import React, { forwardRef, useState } from 'react';
import { View, Platform } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '~/components/ui/themed-text';
import { BaseSheet } from '../common';
import { Calendar } from '~/components/ui/calendar';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Button } from '~/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useOpenPeepsTheme } from '~/theme/OpenPeepsThemeProvider';
import {
  utcIsoToWallClockDate,
  wallClockDateToUtcIso,
} from '@openpeepshq/common/lib';

interface DateSheetProps {
  value?: string;
  timeZone?: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

const pickerDate = (value: string | undefined, timeZone?: string): Date => {
  if (!value) return new Date();
  return timeZone ? utcIsoToWallClockDate(value, timeZone) : new Date(value);
};

const emitIso = (date: Date, timeZone?: string): string =>
  timeZone ? wallClockDateToUtcIso(date, timeZone) : date.toISOString();

export const DateSheet = forwardRef<BottomSheetModal, DateSheetProps>(
  ({ value, timeZone, onChange, onClose }, ref) => {
    const [selectedDate, setSelectedDate] = useState<Date>(() =>
      pickerDate(value, timeZone)
    );
    const [mode, setMode] = useState<'date' | 'time'>('date');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const { t } = useTranslation();
    const { isDark, colors } = useOpenPeepsTheme();
    const pickerThemeVariant = isDark ? 'dark' : 'light';

    const handleTimeSelect = (event: DateTimePickerEvent, time?: Date) => {
      setShowTimePicker(false);
      if (event.type === 'set' && time) {
        const newDateTime = new Date(selectedDate);
        newDateTime.setHours(time.getHours());
        newDateTime.setMinutes(time.getMinutes());
        setSelectedDate(newDateTime);
        onChange(emitIso(newDateTime, timeZone));
        onClose();
      }
    };

    const renderAndroidPicker = () => (
      <>
        <Calendar
          style={{ height: 358 }}
          onDayPress={(day: { dateString: string }) => {
            if (day.dateString) {
              const newDate = new Date(day.dateString);
              newDate.setHours(selectedDate.getHours());
              newDate.setMinutes(selectedDate.getMinutes());
              setSelectedDate(newDate);
            }
          }}
          markedDates={{
            [selectedDate.toISOString().split('T')[0]]: {
              selected: true,
            },
          }}
          current={selectedDate.toISOString()}
        />
        <View className="mt-4">
          <Button variant="outline" onPress={() => setShowTimePicker(true)}>
            <ThemedText>
              {t('common.form.time')}:{' '}
              {selectedDate.toLocaleTimeString().slice(0, -3)}
            </ThemedText>
          </Button>
        </View>
        {showTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="time"
            is24Hour={true}
            onChange={handleTimeSelect}
            display="default"
            themeVariant={pickerThemeVariant}
            textColor={colors.foreground}
          />
        )}
      </>
    );

    const renderIOSPicker = () => (
      <>
        <DateTimePicker
          value={selectedDate}
          mode={mode}
          is24Hour={true}
          onChange={(event, date) => {
            if (date) {
              setSelectedDate(date);
            }
          }}
          display="spinner"
          style={{ height: 250 }}
          themeVariant={pickerThemeVariant}
          textColor={colors.foreground}
        />
        <View className="flex-row gap-4 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => setMode(mode === 'date' ? 'time' : 'date')}
          >
            <ThemedText>
              {t('common.form.switchTo')}{' '}
              {mode === 'date' ? t('common.form.time') : t('common.form.date')}
            </ThemedText>
          </Button>
          <Button
            className="flex-1"
            onPress={() => {
              onChange(emitIso(selectedDate, timeZone));
              onClose();
            }}
          >
            <ThemedText>{t('common.done')}</ThemedText>
          </Button>
        </View>
      </>
    );

    return (
      <BaseSheet ref={ref} enableOverDrag={false}>
        <View className="flex-1 px-4 pt-2 pb-8">
          <ThemedText className="text-center text-xl tracking-wider font-semibold mb-4">
            {t('common.form.select')}{' '}
            {Platform.OS === 'ios'
              ? mode === 'date'
                ? t('common.form.date')
                : t('common.form.time')
              : t('common.form.date')}
          </ThemedText>

          {Platform.OS === 'ios' ? renderIOSPicker() : renderAndroidPicker()}
        </View>
      </BaseSheet>
    );
  }
);
