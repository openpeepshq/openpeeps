import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { truncateText } from '@openpeepshq/common/lib';
import { useT, useSetPageHeader } from '../../index';
import { ResourceForm } from '../../components/post/post-form/ResourceForm';
import { useEditResource } from '../../hooks';
import { Button, LoadingSpinner, Toast } from '@openpeepshq/react-ui';

export const EditResource = () => {
  const t = useT();
  const { resourceId = '' } = useParams<{ resourceId: string }>();
  const {
    postQuery,
    postData,
    setPostData,
    resourceTitle,
    submitting,
    error,
    clearError,
    submit,
  } = useEditResource(resourceId);

  const headerActions = useMemo(
    () => (
      <Button
        title={t('resources.update.title', { defaultValue: 'Update resource' })}
        variant="default"
        action={submit}
        disabled={submitting}
      >
        {submitting
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('resources.update.title', { defaultValue: 'Update resource' })}
      </Button>
    ),
    [submit, submitting, t],
  );

  useSetPageHeader(
    resourceTitle
      ? `${t('resources.edit', { defaultValue: 'Edit resource' })} ${truncateText(resourceTitle)}`
      : t('resources.edit', { defaultValue: 'Edit resource' }),
    headerActions,
  );

  if (postQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }
  if (!postQuery.data || !postData) {
    return (
      <div className="p-8 text-center text-2xl">
        {t('resources.notFound', { defaultValue: 'Resource not found' })}
      </div>
    );
  }

  return (
    <div className="pb-12">
      <ResourceForm postData={postData} onChange={setPostData} isEdit />
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
