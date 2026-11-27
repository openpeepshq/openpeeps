import React, { useEffect, useMemo } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useNewEvent } from '@openpeepshq/react';
import { useSetPageHeader } from '../../components/layout';
import { Button } from '../../components/ui/button';
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
    notify,
    setNotify,
    showNotify,
    submit,
  } = useNewEvent();

  useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  // Direct messages can't be drafts (error.draftNotDirect). A derived boolean
  // keeps `headerActions` referentially stable — using `postData` directly
  // would re-fire useSetPageHeader on every keystroke.
  const isDirect = postData.visibility === 'direct';

  const headerActions = useMemo(() => {
    if (!canCreate) return undefined;
    return (
      <>
        <Button
          variant="ghost"
          className="mr-1"
          testID="events-save-draft"
          onPress={async () => {
            const saved = await submit(true);
            if (saved) {
              Toast.show({
                type: 'success',
                text1: t('posts.create.draftSavedToast', {
                  defaultValue: 'Draft saved',
                }),
              });
            }
          }}
          disabled={submitting || !canSubmit || isDirect}
        >
          <ThemedText>
            {t('posts.create.saveDraft', { defaultValue: 'Save draft' })}
          </ThemedText>
        </Button>
        <Button
          onPress={() => submit()}
          disabled={submitting || !canSubmit}
          testID="events-create-submit"
        >
          <ThemedText className="text-primary-foreground font-semibold">
            {submitting ? t('common.submitting') : t('events.create.title')}
          </ThemedText>
        </Button>
      </>
    );
  }, [canCreate, canSubmit, submit, submitting, isDirect, t]);

  useSetPageHeader(t('events.create.title'), headerActions);

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
        <EventForm
          postData={postData}
          onChange={setPostData}
          showNotify={showNotify}
          notify={notify}
          onNotifyChange={setNotify}
        />
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
