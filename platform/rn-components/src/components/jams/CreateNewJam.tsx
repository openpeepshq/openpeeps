import React from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PhoneCallIcon } from '~/components/icons';
import { useCreateNewJam } from './CreateNewJamContext';

export const CreateNewJam = () => {
  const { t } = useTranslation();
  const { openCreateJam } = useCreateNewJam();

  return (
    <Pressable
      accessibilityLabel={t('jams.create.title')}
      onPress={openCreateJam}
      className="z-20 absolute bottom-10 right-6 size-16 flex items-center justify-center bg-foreground rounded-full"
    >
      <PhoneCallIcon size={24} className="text-background" />
    </Pressable>
  );
};
