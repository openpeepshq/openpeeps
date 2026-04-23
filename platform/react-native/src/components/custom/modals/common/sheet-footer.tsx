import React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {Button} from '../../../ui/button';
import {ThemedText} from '../../../ui/themed-text';
import {useTranslation} from 'react-i18next';

type Variants =
  | 'outline'
  | 'link'
  | 'default'
  | 'destructive'
  | 'secondary'
  | 'ghost'
  | null
  | undefined;
interface SheetFooterProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelText?: string;
  confirmText?: string;
  disabled?: boolean;
  variant?: Variants;
  confirmVariant?: Variants;
  isLoading?: boolean;
}

export const SheetFooter: React.FC<SheetFooterProps> = ({
  onCancel,
  onConfirm,
  cancelText,
  confirmText,
  disabled = false,
  variant = 'outline',
  confirmVariant = 'default',
  isLoading,
}) => {
  const {t} = useTranslation();

  return (
    <View className="flex-row justify-between px-5 gap-4 mt-auto pt-4 mb-10">
      <Button variant={variant} className="flex-1" onPress={onCancel}>
        <ThemedText className="font-semibold">
          {cancelText || t('common.form.cancel')}
        </ThemedText>
      </Button>
      <Button
        variant={confirmVariant}
        className="flex-1 flex-row"
        onPress={onConfirm}
        disabled={disabled}>
        {isLoading && <ActivityIndicator className="mr-3" size={16} />}
        <ThemedText className="font-semibold">
          {confirmText || t('common.done')}
        </ThemedText>
      </Button>
    </View>
  );
};
