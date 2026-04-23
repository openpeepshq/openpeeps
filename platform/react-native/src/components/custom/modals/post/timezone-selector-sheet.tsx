import {KeyboardAvoidingView, Pressable, View} from 'react-native';
import React, {forwardRef} from 'react';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {BaseSheet} from '../common';
import {ThemedText} from '../../../ui/themed-text';
import {useTranslation} from 'react-i18next';
import timezones from 'timezones-list';
import {CheckIcon, SearchIcon} from '../../../icons';
import {Input} from '../../../ui/input';
import { bottomSheetClose, bottomSheetDismiss } from '../../../../lib/bottom-sheet-ref';
type ItemProps = {
  tzCode: string;
  utc: string;
  checked: boolean;
  onPress: (value: string) => void;
};

interface TimeZoneSelectorSheetProps {
  initialTimeZone?: string;
  onDone: (timezone: string | undefined) => void;
}
export const TimeZoneSelectorSheet = forwardRef<
  BottomSheetModal,
  TimeZoneSelectorSheetProps
>(({initialTimeZone, onDone}, ref) => {
  const [timezone, setTimezone] = React.useState(
    initialTimeZone ? initialTimeZone : undefined,
  );
  const [filteredTimezones, setFilteredTimezones] = React.useState(timezones);
  const [searchQuery, setSearchQuery] = React.useState('');

  const {t} = useTranslation();

  React.useEffect(() => {
    if (searchQuery) {
      setFilteredTimezones(
        timezones.filter(tz =>
          tz.tzCode.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      );
    } else {
      setFilteredTimezones(timezones);
    }
  }, [searchQuery]);

  return (
    <BaseSheet ref={ref} scrollable>
      <KeyboardAvoidingView className=" p-4">
        <ThemedText className="text-center text-xl font-semibold mb-6">
          {t('events.form.timezone')}
        </ThemedText>
        <View className="flex-row items-center mb-4 w-full">
          <View className="rounded-l-md border border-r-0 border-input py-3 px-2">
            <SearchIcon size={24} className="text-muted-foreground" />
          </View>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('events.form.timezoneSearch')}
            className="rounded-r-md border-l-0 rounded-l-none flex-1"
          />
        </View>
        {filteredTimezones.map((tz, idx) => (
          <Item
            key={idx}
            tzCode={tz.tzCode}
            utc={tz.utc}
            onPress={value => {
              setTimezone(value);
              onDone(value);
              bottomSheetClose(ref);
            }}
            checked={timezone === tz.tzCode}
          />
        ))}
        {filteredTimezones.length === 0 && (
          <ThemedText className="text-center">No timezones found</ThemedText>
        )}
      </KeyboardAvoidingView>
    </BaseSheet>
  );
});

const Item = ({tzCode, utc, checked, onPress}: ItemProps) => (
  <Pressable
    className="w-full flex-row gap-x-4 items-center mb-2 py-2"
    onPress={() => {
      onPress(tzCode);
    }}>
    <ThemedText className="text-lg text-muted-foreground font-semibold">
      {tzCode}
    </ThemedText>
    <ThemedText className="text-md text-muted-foreground">{utc}</ThemedText>
    {checked && <CheckIcon className="text-muted-foreground" size={18} />}
  </Pressable>
);
