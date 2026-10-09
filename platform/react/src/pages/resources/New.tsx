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
    submitting,
    error,
    clearError,
    submit,
  } = useNewResource();

  const headerActions = useMemo(
    () => (
      <Button
        title={t('resources.create.title', { defaultValue: 'Create resource' })}
        variant="default"
        action={submit}
        disabled={submitting || !canSubmit}
        data-testid="resources-submit"
      >
        {submitting
          ? t('common.submitting', { defaultValue: 'Publishing…' })
          : t('resources.create.title', { defaultValue: 'Create resource' })}
      </Button>
    ),
    [canSubmit, submit, submitting, t],
  );

  useSetPageHeader(
    t('resources.new', { defaultValue: 'New resource' }),
    headerActions,
  );

  return (
    <div className="pb-12">
      <ResourceForm postData={postData} onChange={setPostData} />
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
