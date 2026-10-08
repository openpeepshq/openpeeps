import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTimezonePreference } from '@openpeepshq/react';
import { GenericHeader } from '~/components/custom';
import { TimeZoneSelect } from '~/components/form';
import { MainScreenProps } from '~/components/navigation/types';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { ThemedText } from '~/components/ui/themed-text';
import { ThemedView } from '~/components/ui/themed-view';
import { ChevronRightIcon } from '~/components/icons';
import { bottomSheetPresent } from '~/lib/bottom-sheet-ref';

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

  if (!profile) return null;

  const label =
    timeZone === communityDefaultTimeZone
      ? `${timeZone} ${t('settings.timezone.communityDefault')}`
      : timeZone;

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={t('settings.timezone.title')}
        rightButtonTitle={
          saving ? t('common.form.loading') : t('common.form.save')
        }
        onRightButtonPress={() => void save()}
        rightButtonDisabled={saving}
      />
      <ThemedView className="flex-1 p-4">
        <ThemedText className="text-lg text-muted-foreground mb-4">
          {t('settings.timezone.timezoneDescription')}
        </ThemedText>
        <Pressable
          onPress={() => bottomSheetPresent(sheetRef)}
          className="py-3 flex-row justify-between items-center border-b border-border"
        >
          <View className="flex-1">
            <ThemedText className="text-lg">{label}</ThemedText>
          </View>
          <ChevronRightIcon className="text-foreground" />
        </Pressable>
      </ThemedView>
      <TimeZoneSelect
        ref={sheetRef}
        initialTimeZone={timeZone}
        onDone={(next) => next && setTimeZone(next)}
      />
    </ThemedSafeAreaView>
  );
};
