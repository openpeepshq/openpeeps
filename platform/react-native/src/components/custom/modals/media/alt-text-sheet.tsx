import React, { forwardRef, useState } from 'react';
import { View, TextInput } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '~/components/ui/themed-text';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import { useOpenPeepsTheme } from '~/theme/OpenPeepsThemeProvider';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface AltSheetProps {
  onUpdate?: (altText: string) => Promise<void> | void;
  initialAltText: string;
}

export const AltSheet = forwardRef<BottomSheetModal, AltSheetProps>(
  ({ onUpdate, initialAltText }, ref) => {
    const [isLoading, setIsLoading] = useState(false);
    const [altText, setAltText] = useState(initialAltText);
    const { t } = useTranslation();
    const { colors } = useOpenPeepsTheme();

    const handleConfirm = async () => {
      if (onUpdate) {
        setIsLoading(true);
        try {
          await onUpdate(altText);
          bottomSheetDismiss(ref);
        } catch (error) {
          console.error('Error updating alt text:', error);
          // Optionally, show an error message to the user
        }
        setIsLoading(false);
      }
    };

    // Update altText state if initialAltText prop changes
    React.useEffect(() => {
      setAltText(initialAltText);
    }, [initialAltText]);

    return (
      <BaseSheet ref={ref}>
        <View className="flex-1">
          <View className="flex-1 p-4 justify-between">
            <View>
              <View className="items-center mb-5">
                <ThemedText className="text-xl font-semibold">
                  {t('media.image.addAltText')}
                </ThemedText>
              </View>

              <ThemedText className="text-sm font-medium mb-1">
                {t('media.image.altTextLabel')}
              </ThemedText>
              <TextInput
                placeholder={t('media.image.altTextPlaceholder')}
                placeholderTextColor={colors['muted-foreground']}
                value={altText}
                onChangeText={setAltText}
                multiline
                numberOfLines={4}
                className="bg-input border border-border rounded-md p-3 text-foreground text-base h-24 ios:h-24"
                style={{ textAlignVertical: 'top' }} // Ensures text starts from top in multiline
              />
              <ThemedText className="text-xs text-muted-foreground mt-2">
                {t('media.image.altTextDescription')}
              </ThemedText>
            </View>

            <SheetFooter
              onCancel={() => bottomSheetDismiss(ref)}
              onConfirm={handleConfirm}
              confirmText={t('common.done')}
              disabled={isLoading}
            />
          </View>
        </View>
      </BaseSheet>
    );
  },
);
