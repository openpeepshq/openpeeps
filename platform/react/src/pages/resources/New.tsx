import { useMemo } from 'react';
import { useT, useSetPageHeader } from '../../index';
import { ResourceForm } from '../../components/post/post-form/ResourceForm';
import { useNewResource } from '../../hooks';
import { Button, Toast } from '@openpeepshq/react-ui';

export const NewResource = () => {
  const t = useT();
  const {
    postData,
    setPostData,
    canSubmit,
    groupOnly,
    submitting,
    error,
    clearError,
    submit,
  } = useNewResource();

  // Direct messages can't be drafts (error.draftNotDirect). A derived
  // boolean keeps `headerActions` stable — raw `postData` in the deps would
  // re-fire useSetPageHeader on every keystroke.
  const isDirect = postData?.visibility === 'direct';

  const headerActions = useMemo(
    () => (
      <>
        <Button
          title={t('posts.create.saveDraft', { defaultValue: 'Save draft' })}
          variant="ghost"
          action={() => submit(true)}
          disabled={submitting || !canSubmit || isDirect}
          data-testid="resources-save-draft"
        >
          {t('posts.create.saveDraft', { defaultValue: 'Save draft' })}
        </Button>
        <Button
          title={t('resources.create.title', {
            defaultValue: 'Create resource',
          })}
          variant="default"
          action={submit}
          disabled={submitting || !canSubmit}
          data-testid="resources-submit"
        >
          {submitting
            ? t('common.submitting', { defaultValue: 'Publishing…' })
            : t('resources.create.title', { defaultValue: 'Create resource' })}
        </Button>
      </>
    ),
    [canSubmit, submit, submitting, isDirect, t],
  );

  useSetPageHeader(
    t('resources.new', { defaultValue: 'New resource' }),
    headerActions,
  );

  return (
    <div className="pb-12">
      <ResourceForm
        postData={postData}
        onChange={setPostData}
        groupOnly={groupOnly}
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
};
