import { MainScreenProps } from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeeps/react';
import { GenericHeader } from '~/components/custom';
import React, { useEffect, useState } from 'react';
import { ThemedText } from '~/components/ui/themed-text';
import { ThemedView } from '~/components/ui/themed-view';
import Toast from 'react-native-toast-message';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { getTheme, THEME_OPTIONS, type ThemeOptions } from '@openpeeps/common';
import { useOpenPeepsTheme } from '~/theme/OpenPeepsThemeProvider';
import { useAppImagesStore } from '~/stores/useAppImagesStore';

type ThemeSettingsProps = MainScreenProps<'ThemeSettings'>;

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ }) => {
    const { openpeepsApi, currentProfile } = useOpenpeeps();
    const { data: profileSettings } = openpeepsApi.useCurrentProfileSettings();
    const { refresh } = useOpenPeepsTheme();
    const updateProfileSettings = openpeepsApi.updateCurrentProfileSettingsAction();
    const [selectedTheme, setSelectedTheme] = useState<ThemeOptions | undefined>(
        profileSettings?.theme,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { t } = useTranslation();
    const {setBackground, setLogoSmall} = useAppImagesStore();
    const { data: serverInfo } = openpeepsApi.useServerInfo();

    useEffect(() => {
        if (profileSettings?.theme) {
            setSelectedTheme(profileSettings.theme);
        }
    }, [profileSettings]);

    const handleSubmit = async () => {
        if (!selectedTheme) {
            Toast.show({
                type: 'error',
                text1: t('settings.theme.updateError'),
            });
            return;
        }

        if (!currentProfile?.id) {
            Toast.show({
                type: 'error',
                text1: t('settings.theme.updateError'),
            });
            return;
        }

        setIsSubmitting(true);
        updateProfileSettings({ id: currentProfile.id, theme: selectedTheme })
            .then(async (response) => {
                Toast.show({
                    type: 'success',
                    text1: t('settings.theme.updateSuccess'),
                });
                return response
            })
            .then(async(newProfileSettings)=> {
                await refresh();
                const userTheme = getTheme(
                    serverInfo?.communityConfig!,
                    newProfileSettings,
                );
                if (userTheme.background){
                    setBackground(userTheme.background);
                }
                if (userTheme.logoSmall){
                    setLogoSmall(userTheme.logoSmall);
                }
            })
            .catch((err) => {
                console.log('response', err);
                Toast.show({
                    type: 'error',
                    text1: t('settings.theme.updateError'),
                });
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    return (
        <ThemedSafeAreaView style={{ flex: 1 }}>
            <GenericHeader
                title={t('settings.theme.title')}
                rightButtonTitle={
                    isSubmitting ? t('common.form.loading') : t('common.form.save')
                }
                onRightButtonPress={handleSubmit}
                rightButtonDisabled={isSubmitting}
            />
            <ThemedView style={{ flex: 1 }}>
                <KeyboardAwareScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    className="w-full flex p-4">
                    <ThemedText className="text-lg text-muted-foreground mb-4">
                        {t('settings.theme.themeDescription')}
                    </ThemedText>

                    <ThemedView className="gap-4 py-4 w-full rounded-md">
                        <RadioGroup
                            value={selectedTheme || ''}
                            onValueChange={(value) => setSelectedTheme(value as ThemeOptions)}>
                            {THEME_OPTIONS.map((option) => (
                                <Pressable
                                    key={option}
                                    onPress={() => setSelectedTheme(option)}
                                    className="py-3 mb-2 flex-row items-center gap-x-3">
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
