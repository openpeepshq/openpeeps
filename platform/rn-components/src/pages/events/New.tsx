import React, { useEffect } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useNewEvent } from '@openpeepshq/react';
import { HeaderActionButton, useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import { ThemedText } from '../../components/ui/themed-text';
import { MainScreenProps } from '../../components/navigation/types/index';
import { EventForm } from '../../components/post/index';

type NewEventProps = MainScreenProps<'NewEvent'>;

export const NewEvent = (_props: NewEventProps) => {
  const { t } = useTranslation();
  const {
    postData,
    setPostData,
    canCreate,
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

  useSetPageHeader(
    t('events.create.title'),
    canCreate ? (
      <HeaderActionButton
        title={submitting ? t('common.submitting') : t('events.create.title')}
        onPress={() => void submit()}
        disabled={submitting || !canSubmit}
        loading={submitting}
      />
    ) : undefined
  );

  if (!canCreate) {
    return (
      <ThemedView
        className="flex-1 items-center justify-center gap-2 px-6 py-16"
        testID="events-create-not-allowed"
      >
        <ThemedText className="text-center text-xl font-semibold">
          {t('events.create.notAllowed.title')}
        </ThemedText>
        <ThemedText className="text-muted-foreground text-center text-sm">
          {t('events.create.notAllowed.description')}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      <KeyboardAwareScrollView
        contentContainerClassName="grow"
        className="pb-12"
      >
        <EventForm postData={postData} onChange={setPostData} />
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
