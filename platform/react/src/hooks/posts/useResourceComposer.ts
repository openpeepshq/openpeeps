import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  GroupWithMeta,
  PostCreationData,
  PostDataUnion,
  ResourcePost,
} from '@openpeepshq/common/types';
import {
  checkGroupCapabilities,
  normalizeResourceTags,
  resourceFormIssues,
  resourceVisibilityForCapabilities,
  type ResourceFormIssue,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useNavigate } from '../../contexts/router';
import { useT } from '../../i18n/context';
import {
  useAuthData,
  useCurrentProfile,
} from '../../components/layout/IdentityContext';
import { useServerInfo } from '../../components/server-data';
import { buildAudienceChoiceValues } from '../../lib/audienceChoices';
import { defaultNewResource, getNewPostStores } from '../../stores';

const asResource = (data: PostDataUnion | undefined): ResourcePost | null =>
  data?.type === 'resource' ? data : null;

const preparedResource = (resource: ResourcePost): ResourcePost => ({
  ...resource,
  title: resource.title.trim(),
  tags: normalizeResourceTags(resource.tags),
  categoryPath: (resource.categoryPath ?? [])
    .map((segment) => segment.trim())
    .filter(Boolean),
  url:
    resource.resourceKind === 'link'
      ? resource.url?.trim() || undefined
      : undefined,
});

const issuesFor = (postData: PostCreationData): ResourceFormIssue[] => {
  const resource = asResource(postData.data);
  if (!resource) return ['title'];
  return resourceFormIssues({
    title: resource.title,
    resourceKind: resource.resourceKind,
    url: resource.url,
    attachments: resource.attachments,
    visibility: postData.visibility,
    audience: postData.audience,
    groupId: postData.groupId,
  });
};

const issueMessage = (
  issue: ResourceFormIssue,
  t: (key: string, options: { defaultValue: string }) => string,
): string => {
  if (issue === 'title') {
    return t('resources.validation.titleRequired', {
      defaultValue: 'Title is required',
    });
  }
  if (issue === 'titleLength') {
    return t('resources.validation.titleTooLong', {
      defaultValue: 'Title must be 200 characters or fewer',
    });
  }
  if (issue === 'url') {
    return t('resources.validation.url', {
      defaultValue: 'Enter a real link, like https://example.com',
    });
  }
  if (issue === 'media') {
    return t('resources.validation.mediaRequired', {
      defaultValue: 'Add the media or link this resource needs',
    });
  }
  if (issue === 'group') {
    return t('resources.validation.groupRequired', {
      defaultValue: 'Choose a group before creating this resource.',
    });
  }
  return t('resources.validation.directAudience', {
    defaultValue: 'Choose at least one recipient for a direct resource.',
  });
};

const submitErrorMessage = (
  err: unknown,
  t: (key: string, options: { defaultValue: string }) => string,
) => {
  const message = err instanceof Error ? err.message : '';
  if (message === 'Forbidden') {
    return t('resources.validation.audienceForbidden', {
      defaultValue: 'Choose a group you can post this resource in.',
    });
  }
  return message;
};

export const useNewResource = () => {
  const t = useT();
  const navigate = useNavigate();
  const serverInfo = useServerInfo();
  const authData = useAuthData();
  const me = useCurrentProfile();
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

  const audience = useMemo(() => {
    if (!authData.profile || authData.scopes.length === 0) return null;
    const choices = buildAudienceChoiceValues('resource', authData, t, {
      publicContent: serverInfo.publicContent,
      showDirect: true,
    });
    const memberships = me?.memberships;
    const postableGroupIds =
      memberships == null
        ? null
        : memberships
            .map((membership) => membership.group as GroupWithMeta)
            .filter(
              (group) =>
                checkGroupCapabilities(
                  authData,
                  ['core-posts-create-resource'],
                  group,
                ).success,
            )
            .map((group) => group.id);
    const next = resourceVisibilityForCapabilities({
      visibility: postData.visibility,
      groupId: postData.groupId,
      allowed: choices.map((choice) => choice.value),
      postableGroupIds,
    });
    return {
      ...next,
      groupOnly: choices.length === 1 && choices[0]?.value === 'group',
      hasChoice: choices.length > 0,
    };
  }, [
    authData,
    me?.memberships,
    postData.groupId,
    postData.visibility,
    serverInfo.publicContent,
    t,
  ]);

  useEffect(() => {
    if (!audience?.hasChoice) return;
    if (
      audience.visibility === postData.visibility &&
      (audience.groupId ?? undefined) === (postData.groupId ?? undefined)
    ) {
      return;
    }
    const next = {
      ...postData,
      visibility: audience.visibility,
      groupId: audience.groupId,
    };
    setPostDataState(next);
    stores.resource = next;
  }, [audience, postData, stores]);

  const resource = asResource(postData.data);
  const audienceReady =
    !!audience?.hasChoice &&
    audience.visibility === postData.visibility &&
    (audience.groupId ?? undefined) === (postData.groupId ?? undefined);
  const canSubmit = audienceReady && issuesFor(postData).length === 0;

  const setPostData = (data: PostCreationData) => {
    setPostDataState(data);
    stores.resource = data;
  };

  const submit = useCallback(async () => {
    setError(null);
    if (!audienceReady) return;
    const issue = issuesFor(postData)[0];
    if (!resource || issue) {
      if (issue) setError(issueMessage(issue, t));
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
      setError(submitErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }, [audienceReady, createPost, navigate, postData, resource, stores, t]);

  return {
    postData,
    setPostData,
    groupOnly: audience?.groupOnly ?? false,
    canSubmit,
    submitting,
    error,
    clearError: () => setError(null),
    submit,
  };
};

export const useEditResource = (resourceId: string) => {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(resourceId);
  const updatePost = openpeepsApi.updatePostAction({ id: resourceId });

  const [postData, setPostData] = useState<PostCreationData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      postQuery.data &&
      postQuery.data.type === 'resource' &&
      postQuery.data.data
    ) {
      setPostData({
        visibility: postQuery.data.visibility,
        type: 'resource',
        groupId: postQuery.data.groupId ?? undefined,
        audience: postQuery.data.audience ?? undefined,
        data: postQuery.data.data as PostDataUnion & { type: 'resource' },
      });
    }
  }, [postQuery.data]);

  const resourceTitle = asResource(postQuery.data?.data)?.title;
  const canSubmit = !!postData && issuesFor(postData).length === 0;

  const submit = useCallback(async () => {
    if (!postData) return;
    const resource = asResource(postData.data);
    if (!resource) return;
    setError(null);
    const issue = issuesFor(postData)[0];
    if (issue) {
      setError(issueMessage(issue, t));
      return;
    }
    setSubmitting(true);
    try {
      await updatePost(preparedResource(resource));
      navigate({ type: 'post', id: resourceId });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [navigate, postData, resourceId, t, updatePost]);

  return {
    postQuery,
    postData,
    setPostData,
    resourceTitle,
    canSubmit,
    submitting,
    error,
    clearError: () => setError(null),
    submit,
  };
};
