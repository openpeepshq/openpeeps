import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSetPlusButtonActions } from '../layout';
import { useCreateNewJam } from './CreateNewJamContext';

export const CreateNewJam = () => {
  const { t } = useTranslation();
  const { openCreateJam } = useCreateNewJam();

  const plusActions = useMemo(
    () => ({
      title: t('jams.create.title'),
      action: openCreateJam,
    }),
    [openCreateJam, t]
  );

  useSetPlusButtonActions(plusActions);
  return null;
};
