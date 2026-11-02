import { useCallback, useEffect, useState } from 'react';
import {
  canAnnouncePosts,
  isCommunityWideVisibility,
} from '@openpeepshq/common';
import type {
  Article,
  PostCreationData,
  PostDataUnion,
} from '@openpeepshq/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useNavigate } from '../../contexts/router';
import { useT } from '../../i18n/context';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useServerInfo } from '../../components/server-data';
import { defaultNewArticle, getNewPostStores } from '../../stores';

export const useNewArticle = () => {
  const t = useT();
  const navigate = useNavigate();
  const serverInfo = useServerInfo();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();
  const announcePost = openpeepsApi.admin.announcePostAction();
  const stores = getNewPostStores();

  const [postData, setPostDataState] = useState<PostCreationData>(() => {
    const stored = stores.article;
    if (stored.type === 'article' && stored.data.type === 'article') {
      return stored;
    }
    return defaultNewArticle(serverInfo.publicContent);
  });
  const [notify, setNotify] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showNotify =
    canAnnouncePosts(me?.roles) &&
    isCommunityWideVisibility(postData.visibility);

  const article = postData.data.type === 'article' ? postData.data : null;
  const canSubmit =
    !!article?.title?.trim() &&
    !(postData.visibility === 'direct' && !postData.audience?.length);

  const setPostData = (data: PostCreationData) => {
    setPostDataState(data);
    stores.article = data;
  };

  const submit = useCallback(async () => {
    setError(null);
    if (!article?.title?.trim()) {
      setError(
        t('articles.validation.titleRequired', {
          defaultValue: 'Title is required',
        }),
      );
      return;
    }
    if (postData.visibility === 'direct' && !postData.audience?.length) {
      setError('Choose at least one recipient for a direct article.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createPost({ ...postData, type: 'article' });
      if (notify && showNotify && created.id) {
        await announcePost({ id: created.id });
      }
      stores.resetNewArticleState();
      navigate({ type: 'post', id: created.id });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [
    announcePost,
    article,
    createPost,
    navigate,
    notify,
    postData,
    showNotify,
    stores,
    t,
  ]);

  return {
    postData,
    setPostData,
    canSubmit,
    submitting,
    error,
    clearError: () => setError(null),
    notify,
    setNotify,
    showNotify,
    submit,
  };
};

export const useEditArticle = (articleId: string) => {
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(articleId);
  const updatePost = openpeepsApi.updatePostAction({ id: articleId });

  const [postData, setPostData] = useState<PostCreationData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postQuery.data && postQuery.data.type === 'article') {
      setPostData({
        visibility: postQuery.data.visibility,
        type: 'article',
        groupId: postQuery.data.groupId ?? undefined,
        audience: postQuery.data.audience ?? undefined,
        data: postQuery.data.data as PostDataUnion & { type: 'article' },
      });
    }
  }, [postQuery.data]);

  const articleTitle = (postQuery.data?.data as Article | undefined)?.title;

  const submit = useCallback(async () => {
    if (!postData) return;
    setError(null);
    setSubmitting(true);
    try {
      const article = postData.data.type === 'article' ? postData.data : null;
      await updatePost(article as PostDataUnion);
      navigate({ type: 'post', id: articleId });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [articleId, navigate, postData, updatePost]);

  return {
    postQuery,
    postData,
    setPostData,
    articleTitle,
    submitting,
    error,
    clearError: () => setError(null),
    submit,
  };
};
