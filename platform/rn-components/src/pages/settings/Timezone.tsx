import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTimezonePreference } from '@openpeepshq/react';
import { HeaderActionButton, useSetPageHeader } from '../../components/layout';
import { TimeZoneSelect } from '../../components/form/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';
import { ChevronRightIcon } from '../../components/icons/index';
import { bottomSheetPresent } from '../../lib/bottom-sheet-ref';

type TimezoneSettingsProps = MainScreenProps<'TimezoneSettings'>;

export const TimezoneSettings: React.FC<TimezoneSettingsProps> = () => {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);
  const {
    profile,
    timeZone,
    setTimeZone,
    communityDefaultTimeZone,
    saving,
    save,
    status,
    clearStatus,
  } = useTimezonePreference();

  React.useEffect(() => {
    if (!status) return;
    Toast.show({ type: status.type, text1: status.message });
    clearStatus();
  }, [status, clearStatus]);

  const label =
    timeZone === communityDefaultTimeZone
      ? `${timeZone} ${t('settings.timezone.communityDefault')}`
      : timeZone;

  useSetPageHeader(
    t('settings.timezone.title'),
    <HeaderActionButton
      title={saving ? t('common.form.loading') : t('common.form.save')}
      onPress={() => void save()}
      disabled={saving}
      loading={saving}
    />
  );

  if (!profile) return null;

  return (
    <ThemedView className="flex-1 p-4">
      <ThemedText className="mb-4 text-lg text-muted-foreground">
        {t('settings.timezone.timezoneDescription')}
      </ThemedText>
      <Pressable
        onPress={() => bottomSheetPresent(sheetRef)}
        className="flex-row items-center justify-between border-b border-border py-3"
      >
        <View className="flex-1">
          <ThemedText className="text-lg">{label}</ThemedText>
        </View>
        <ChevronRightIcon className="text-foreground" />
      </Pressable>
      <TimeZoneSelect
        ref={sheetRef}
        initialTimeZone={timeZone}
        onDone={(next) => next && setTimeZone(next)}
      />
    </ThemedView>
  );
};
