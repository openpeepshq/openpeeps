import {TextInput, View} from 'react-native';
import React, {forwardRef} from 'react';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {BaseSheet, SheetFooter} from '../common';
import {ThemedText} from '../../../ui/themed-text';
import {useTranslation} from 'react-i18next';
import {cn} from '../../../../lib/utils';
import { bottomSheetClose, bottomSheetDismiss } from '../../../../lib/bottom-sheet-ref';

interface EventDescriptionSheetProps {
  initialDescription?: string;
  onDone: (description: string) => void;
}
export const EventDescriptionSheet = forwardRef<
  BottomSheetModal,
  EventDescriptionSheetProps
>(({initialDescription, onDone}, ref) => {
  const [description, setDescription] = React.useState(
    initialDescription ? initialDescription : '',
  );
  const {t} = useTranslation();

  const handleDone = async () => {
    try {
      onDone(description);
      bottomSheetClose(ref);
    } catch (error) {
      console.error('Failed to Save', error);
    } finally {
    }
  };

  return (
    <BaseSheet ref={ref}>
      <View className=" p-4">
        <ThemedText className="text-center text-xl font-semibold mb-6">
          {t('events.form.descriptionPlaceholder')}
        </ThemedText>
        <TextInput
          className={cn('px-4 pt-6 text-lg text-foreground max-h-[46%]')}
          placeholder={t('events.form.descriptionPlaceholder')}
          placeholderTextColor="#666"
          multiline
          value={description}
          onChangeText={setDescription}
          maxLength={5000}
        />

        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          onConfirm={handleDone}
          confirmText={t('common.done')}
          variant="destructive"
        />
      </View>
    </BaseSheet>
  );
});
