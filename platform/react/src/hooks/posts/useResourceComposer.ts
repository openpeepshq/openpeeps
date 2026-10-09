import { useCallback, useEffect, useState } from 'react';
import type {
  PostCreationData,
  PostDataUnion,
  ResourcePost,
} from '@openpeepshq/common/types';
import {
  normalizeResourceTags,
  resourceHasRequiredMedia,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useNavigate } from '../../contexts/router';
import { useT } from '../../i18n/context';
import { useServerInfo } from '../../components/server-data';
import { defaultNewResource, getNewPostStores } from '../../stores';

const asResource = (data: PostDataUnion): ResourcePost | null =>
  data.type === 'resource' ? data : null;

const preparedResource = (resource: ResourcePost): ResourcePost => ({
  ...resource,
  title: resource.title.trim(),
  tags: normalizeResourceTags(resource.tags),
  categoryPath: (resource.categoryPath ?? [])
    .map((segment) => segment.trim())
    .filter(Boolean),
  url: resource.url?.trim() || undefined,
});

export const useNewResource = () => {
  const t = useT();
  const navigate = useNavigate();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();
  const stores = getNewPostStores();

  const [postData, setPostDataState] = useState<PostCreationData>(() => {
    const stored = stores.resource;
    if (stored.type === 'resource' && stored.data.type === 'resource') {
      return stored;
    }
    return defaultNewResource(serverInfo.publicContent);
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resource = asResource(postData.data);
  const canSubmit =
    !!resource?.title.trim() &&
    !!resource &&
    resourceHasRequiredMedia(resource) &&
    !(postData.visibility === 'direct' && !postData.audience?.length);

  const setPostData = (data: PostCreationData) => {
    setPostDataState(data);
    stores.resource = data;
  };

  const submit = useCallback(async () => {
    setError(null);
    if (!resource?.title.trim()) {
      setError(
        t('resources.validation.titleRequired', {
          defaultValue: 'Title is required',
        }),
      );
      return;
    }
    if (!resourceHasRequiredMedia(resource)) {
      setError(
        t('resources.validation.mediaRequired', {
          defaultValue: 'Add the media or link this resource needs',
        }),
      );
      return;
    }
    if (postData.visibility === 'direct' && !postData.audience?.length) {
      setError(
        t('resources.validation.directAudience', {
          defaultValue: 'Choose at least one recipient for a direct resource.',
        }),
      );
      return;
    }
    setSubmitting(true);
    try {
      const created = await createPost({
        ...postData,
        type: 'resource',
        data: preparedResource(resource),
      });
      stores.resetNewResourceState();
      navigate({ type: 'post', id: created.id });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [createPost, navigate, postData, resource, stores, t]);

  return {
    postData,
    setPostData,
    canSubmit,
    submitting,
    error,
    clearError: () => setError(null),
    submit,
  };
};

export const useEditResource = (resourceId: string) => {
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(resourceId);
  const updatePost = openpeepsApi.updatePostAction({ id: resourceId });

  const [postData, setPostData] = useState<PostCreationData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postQuery.data && postQuery.data.type === 'resource') {
      setPostData({
        visibility: postQuery.data.visibility,
        type: 'resource',
        groupId: postQuery.data.groupId ?? undefined,
        audience: postQuery.data.audience ?? undefined,
        data: postQuery.data.data as PostDataUnion & { type: 'resource' },
      });
    }
  }, [postQuery.data]);

  const resourceTitle = asResource(
    postQuery.data?.data as PostDataUnion,
  )?.title;

  const submit = useCallback(async () => {
    if (!postData) return;
    const resource = asResource(postData.data);
    if (!resource) return;
    setError(null);
    setSubmitting(true);
    try {
      await updatePost(preparedResource(resource));
      navigate({ type: 'post', id: resourceId });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [navigate, postData, resourceId, updatePost]);

  return {
    postQuery,
    postData,
    setPostData,
    resourceTitle,
    submitting,
    error,
    clearError: () => setError(null),
    submit,
  };
};
