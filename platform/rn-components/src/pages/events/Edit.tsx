import React, { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { truncateText } from '@openpeepshq/common/lib';
import { useEditEvent } from '@openpeepshq/react';
import { GenericHeader } from '~/components/custom';
import { MainScreenProps } from '~/components/navigation/types';
import { EventForm } from '~/components/post';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { ThemedText } from '~/components/ui/themed-text';

type EditEventProps = MainScreenProps<'EditEvent'>;

export const EditEvent = ({ route }: EditEventProps) => {
  const { id, occurrence } = route.params;
  const { t } = useTranslation();
  const {
    postQuery,
    postData,
    setPostData,
    eventName,
    canSubmit,
    submitting,
    error,
    clearError,
    submit,
  } = useEditEvent(id, occurrence);

  useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  const title = eventName
    ? `${t('events.edit')} ${truncateText(eventName)}`
    : t('events.edit');

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={title}
        rightButtonTitle={
          submitting ? t('common.saving') : t('events.update.title')
        }
        onRightButtonPress={() => void submit()}
        rightButtonDisabled={submitting || !canSubmit}
        rightType="button"
      />
      {postQuery.isLoading ? (
        <ActivityIndicator size="small" />
      ) : !postQuery.data || !postData ? (
        <ThemedText className="p-8 text-center text-2xl">
          {t('events.notFound')}
        </ThemedText>
      ) : (
        <KeyboardAwareScrollView
          contentContainerClassName="grow"
          className="pb-12"
        >
          <EventForm
            postData={postData}
            onChange={setPostData}
            isEdit
            occurrenceEdit={!!occurrence}
          />
        </KeyboardAwareScrollView>
      )}
    </ThemedSafeAreaView>
  );
};
