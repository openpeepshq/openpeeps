import React, { useEffect } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useNewEvent } from '@openpeepshq/react';
import { GenericHeader } from '../../components/custom/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { EventForm } from '../../components/post/index';
import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';

type NewEventProps = MainScreenProps<'NewEvent'>;

export const NewEvent = (_props: NewEventProps) => {
  const { t } = useTranslation();
  const {
    postData,
    setPostData,
    canSubmit,
    submitting,
    error,
    clearError,
    submit,
  } = useNewEvent();

  useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={t('events.create.title')}
        rightButtonTitle={
          submitting ? t('common.submitting') : t('events.create.title')
        }
        onRightButtonPress={() => void submit()}
        rightButtonDisabled={submitting || !canSubmit}
        rightType="button"
      />
      <KeyboardAwareScrollView
        contentContainerClassName="grow"
        className="pb-12"
      >
        <EventForm postData={postData} onChange={setPostData} />
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
