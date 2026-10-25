import { MainScreenProps } from '../../components/navigation/types/index';
import { useServerInfo, useThemePreference } from '@openpeepshq/react';
import { HeaderActionButton, useSetPageHeader } from '../../components/layout';
import React from 'react';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';
import Toast from 'react-native-toast-message';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Pressable, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { getTheme, THEME_OPTIONS } from '@openpeepshq/common';
import { useOpenPeepsTheme } from '../../theme/OpenPeepsThemeProvider';
import { useAppImagesStore } from '../../stores/useAppImagesStore';
import { toAbsoluteMediaUrl } from '../../lib/media-url';

type ThemeSettingsProps = MainScreenProps<'ThemeSettings'>;

export const ThemeSettings: React.FC<ThemeSettingsProps> = () => {
  const { theme, setTheme, submitting, save } = useThemePreference();
  const serverInfo = useServerInfo();
  const { refresh } = useOpenPeepsTheme();
  const { t } = useTranslation();
  const { setBackground, setLogoSmall } = useAppImagesStore();
  const systemColorScheme = useColorScheme();
  const systemScheme = systemColorScheme === 'dark' ? 'dark' : 'light';

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
      const userTheme = getTheme(
        serverInfo.communityConfig,
        {
          theme,
        } as Parameters<typeof getTheme>[1],
        systemScheme
      );
      // Absolute URIs only: RN Image cannot load path-relative URLs.
      setBackground(toAbsoluteMediaUrl(userTheme.background) ?? null);
      setLogoSmall(toAbsoluteMediaUrl(userTheme.logoSmall) ?? null);
    } catch {
      Toast.show({
        type: 'error',
        text1: t('settings.theme.updateError'),
      });
    }
  };

  useSetPageHeader(
    t('settings.theme.title'),
    <HeaderActionButton
      title={submitting ? t('common.form.loading') : t('common.form.save')}
      onPress={() => void handleSubmit()}
      disabled={submitting}
      loading={submitting}
    />
  );

  return (
    <ThemedView className="flex-1">
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
    </ThemedView>
  );
};
