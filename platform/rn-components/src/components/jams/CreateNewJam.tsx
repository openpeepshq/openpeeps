import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlusFab } from '../custom/common/plus-fab';
import { PhoneCallIcon } from '../icons/index';
import { useCreateNewJam } from './CreateNewJamContext';

export const CreateNewJam = () => {
  const { t } = useTranslation();
  const { openCreateJam } = useCreateNewJam();

  return (
    <PlusFab
      accessibilityLabel={t('jams.create.title')}
      onPress={openCreateJam}
    >
      <PhoneCallIcon size={24} className="text-background" />
    </PlusFab>
  );
};
