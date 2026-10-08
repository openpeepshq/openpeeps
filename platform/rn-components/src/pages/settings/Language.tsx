import React from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  AVAILABLE_UI_LANGUAGES,
  useLanguagePreference,
} from '@openpeepshq/react';
import { GenericHeader } from '~/components/custom';
import { MainScreenProps } from '~/components/navigation/types';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { ThemedText } from '~/components/ui/themed-text';
import { ThemedView } from '~/components/ui/themed-view';

const LANGUAGE_LABELS: Record<(typeof AVAILABLE_UI_LANGUAGES)[number], string> =
  {
    en: 'English',
    de: 'Deutsch',
  };

type LanguageSettingsProps = MainScreenProps<'LanguageSettings'>;

export const LanguageSettings: React.FC<LanguageSettingsProps> = () => {
  const { t } = useTranslation();
  const {
    profile,
    language,
    setLanguage,
    communityDefaultLanguage,
    saving,
    save,
    status,
    clearStatus,
  } = useLanguagePreference();

  React.useEffect(() => {
    if (!status) return;
    Toast.show({ type: status.type, text1: status.message });
    clearStatus();
  }, [status, clearStatus]);

  if (!profile) return null;

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={t('settings.language.title')}
        rightButtonTitle={
          saving ? t('common.form.loading') : t('common.form.save')
        }
        onRightButtonPress={() => void save()}
        rightButtonDisabled={saving}
      />
      <ThemedView className="flex-1 p-4">
        <ThemedText className="text-lg text-muted-foreground mb-4">
          {t('settings.language.languageDescription')}
        </ThemedText>
        <RadioGroup value={language} onValueChange={setLanguage}>
          {AVAILABLE_UI_LANGUAGES.map((code) => (
            <Pressable
              key={code}
              onPress={() => setLanguage(code)}
              className="py-3 mb-2 flex-row items-center gap-x-3"
            >
              <RadioGroupItem value={code} />
              <ThemedText className="text-lg">
                {LANGUAGE_LABELS[code]}
                {code === communityDefaultLanguage ? (
                  <ThemedText className="text-sm text-muted-foreground">
                    {' '}
                    {t('settings.language.default')}
                  </ThemedText>
                ) : null}
              </ThemedText>
            </Pressable>
          ))}
        </RadioGroup>
      </ThemedView>
    </ThemedSafeAreaView>
  );
};
