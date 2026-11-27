import { useCallback, useMemo, useRef } from 'react';
import { useT, useSetPageHeader } from '../../index';
import { useNewEvent } from '../../hooks/events/useEventComposer';
import { useToast } from '../../components/layout/ToastProvider';
import { EventForm } from '../../components';
import { Button, Toast } from '@openpeepshq/react-ui';

export function NewEvent() {
  const t = useT();
  const { success: toastSuccess } = useToast();
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

  // `submit` and `toastSuccess` get fresh identities on every render of this
  // page: the openpeeps API is rebuilt on each render (`createPostAction()`),
  // and `ToastProvider` hands out a fresh context value object. This page is
  // also re-rendered by an ANCESTOR — `OpenpeepsContextProvider` subscribes to
  // `pageHeaderStore` above the route and re-fires on every `useSetPageHeader`
  // write, re-rendering `ToastProvider` in the process. If `headerActions`
  // depended on `submit`/`toastSuccess`, that ancestor re-render would hand it
  // a fresh element, re-fire the store, and loop forever (the form never
  // commits). Reading them through refs breaks the chain: `headerActions`
  // then depends only on stable primitives and keeps its identity.
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const toastRef = useRef(toastSuccess);
  toastRef.current = toastSuccess;

  const saveDraft = useCallback(async () => {
    const savedAsDraft = await submitRef.current(true);
    if (savedAsDraft) {
      toastRef.current(
        t('posts.create.draftSavedToast', { defaultValue: 'Draft saved' }),
      );
    }
  }, [t]);

  // Direct messages can't be drafts (error.draftNotDirect), so the
  // Save-draft button is disabled for them. A derived boolean keeps
  // `headerActions` stable — using `postData` directly would re-fire
  // useSetPageHeader on every keystroke.
  const isDirect = postData?.visibility === 'direct';

  const headerActions = useMemo(() => {
    if (!canCreate) return null;
    return (
      <>
        <Button
          title={t('posts.create.saveDraft', { defaultValue: 'Save draft' })}
          variant="ghost"
          action={saveDraft}
          disabled={submitting || !canSubmit || isDirect}
          data-testid="events-save-draft"
        >
          {t('posts.create.saveDraft', { defaultValue: 'Save draft' })}
        </Button>
        <Button
          title={t('events.create.title', { defaultValue: 'Create Event' })}
          variant="default"
          action={() => submitRef.current()}
          disabled={submitting || !canSubmit}
          data-testid="events-create-submit"
        >
          {submitting
            ? t('common.submitting', { defaultValue: 'Creating…' })
            : t('events.create.title', { defaultValue: 'Create Event' })}
        </Button>
      </>
    );
  }, [canCreate, canSubmit, saveDraft, submitting, isDirect, t]);

  useSetPageHeader(
    t('events.create.title', { defaultValue: 'Create Event' }),
    headerActions,
  );

  if (!canCreate) {
    return (
      <div
        className="mx-auto flex max-w-md flex-col gap-2 px-6 py-16 text-center"
        data-testid="events-create-not-allowed"
        role="status"
      >
        <p className="text-xl font-semibold">
          {t('events.create.notAllowed.title', {
            defaultValue: "You can't create events",
          })}
        </p>
        <p className="text-muted-foreground text-sm">
          {t('events.create.notAllowed.description', {
            defaultValue:
              "Your role isn't allowed to create events. Ask a community owner or moderator if you need to host one.",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <EventForm
        postData={postData}
        onChange={setPostData}
        showNotify={showNotify}
        notify={notify}
        onNotifyChange={setNotify}
      />

      {error ? (
        <div className="px-3">
          <Toast variant="error" onDismiss={clearError}>
            {error}
          </Toast>
        </div>
      ) : null}
    </div>
  );
}
