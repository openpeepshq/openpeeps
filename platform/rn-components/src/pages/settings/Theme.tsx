import { MainScreenProps } from '../../components/navigation/types/index';
import { useServerInfo, useThemePreference } from '@openpeepshq/react';
import { GenericHeader } from '../../components/custom/index';
import React from 'react';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';
import Toast from 'react-native-toast-message';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { getTheme, THEME_OPTIONS } from '@openpeepshq/common';
import { useOpenPeepsTheme } from '../../theme/OpenPeepsThemeProvider';
import { useAppImagesStore } from '../../stores/useAppImagesStore';

type ThemeSettingsProps = MainScreenProps<'ThemeSettings'>;

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({}) => {
  const { theme, setTheme, submitting, save } = useThemePreference();
  const serverInfo = useServerInfo();
  const { refresh } = useOpenPeepsTheme();
  const { t } = useTranslation();
  const { setBackground, setLogoSmall } = useAppImagesStore();

  const handleSubmit = async () => {
    if (!theme) {
      Toast.show({
        type: 'error',
        text1: t('settings.theme.updateError'),
      });
      return;
    }

    try {
      await save();
      Toast.show({
        type: 'success',
        text1: t('settings.theme.updateSuccess'),
      });
      await refresh();
      const userTheme = getTheme(serverInfo.communityConfig, {
        theme,
      } as Parameters<typeof getTheme>[1]);
      if (userTheme.background) {
        setBackground(userTheme.background);
      }
      if (userTheme.logoSmall) {
        setLogoSmall(userTheme.logoSmall);
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: t('settings.theme.updateError'),
      });
    }
  };

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={t('settings.theme.title')}
        rightButtonTitle={
          submitting ? t('common.form.loading') : t('common.form.save')
        }
        onRightButtonPress={handleSubmit}
        rightButtonDisabled={submitting}
      />
      <ThemedView className="flex-1">
        <KeyboardAwareScrollView
          contentContainerClassName="grow"
          className="w-full flex p-4"
        >
          <ThemedText className="text-lg text-muted-foreground mb-4">
            {t('settings.theme.themeDescription')}
          </ThemedText>

          <ThemedView className="gap-4 py-4 w-full rounded-md">
            <RadioGroup
              value={theme || ''}
              onValueChange={(value) => setTheme(value as typeof theme)}
            >
              {THEME_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setTheme(option)}
                  className="py-3 mb-2 flex-row items-center gap-x-3"
                >
                  <RadioGroupItem value={option} />
                  <ThemedText className="text-lg">
                    {t(`settings.theme.${option}.mode`)}
                  </ThemedText>
                </Pressable>
              ))}
            </RadioGroup>
          </ThemedView>
        </KeyboardAwareScrollView>
      </ThemedView>
    </ThemedSafeAreaView>
  );
};
