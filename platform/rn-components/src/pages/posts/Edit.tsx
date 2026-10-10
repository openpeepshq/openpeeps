import React, { useEffect, useMemo, useState } from 'react';
import { useOpenpeeps } from '@openpeepshq/react';
import { GenericHeader } from '../../components/custom/index';
import Toast from 'react-native-toast-message';
import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';
import { PostForm } from '../../components/post/post-form/PostForm';
import { useTranslation } from 'react-i18next';
import { MainScreenProps } from '../../components/navigation/types/index';
import {
  PostCreationData,
  pollOptionsWithinLimit,
  postCreationDataSchema,
  resolvePollOptionContents,
} from '@openpeepshq/common';
import { ActivityIndicator } from 'react-native';
import { useForm } from 'react-hook-form';
import { hasProcessingAttachments } from '../../lib/post';

import { ArticleForm } from '../../components/post/index';
type PostProps = MainScreenProps<'EditPost'>;

export const EditPost = ({ route, navigation }: PostProps) => {
  const { id } = route.params;
  const { openpeepsApi } = useOpenpeeps();
  const { data: post, isLoading } = openpeepsApi.usePost(id);

  const [postData, setPostData] = useState<PostCreationData | undefined>(
    undefined
  );

  const form = useForm<PostCreationData>({
    defaultValues: postData,
  });

  useEffect(() => {
    if (post?.data) {
      setPostData(postCreationDataSchema.parse(post));
      form.reset(postCreationDataSchema.parse(post));
    }
  }, [post, form, setPostData]);

  const { t } = useTranslation();

  const updatePost = openpeepsApi.updatePostAction({ id: id });

  const [isPosting, setIsPosting] = useState(false);
  const attachmentsProcessing = hasProcessingAttachments(postData);

  const trimmedContent = (postData?.data.content ?? '').trim();
  const pollOptions =
    postData?.data.type === 'question'
      ? postData.data.options.map((option) => option.content)
      : [];
  const resolvedPollOptions = resolvePollOptionContents(pollOptions, (index) =>
    t('posts.form.poll.option', { number: index + 1 })
  );
  const pollOptionsValid =
    resolvedPollOptions.length >= 2 &&
    pollOptionsWithinLimit(resolvedPollOptions);

  const canSubmit = useMemo(() => {
    if (!postData || isPosting || attachmentsProcessing) {
      return false;
    }
    if (postData.data.type === 'question') {
      return trimmedContent.length > 0 && pollOptionsValid;
    }
    if (postData.type === 'article') {
      return trimmedContent.length > 0;
    }
    return (
      (trimmedContent.length > 0 && trimmedContent.length <= 500) ||
      (postData.data.attachments?.length ?? 0) > 0
    );
  }, [
    attachmentsProcessing,
    isPosting,
    pollOptionsValid,
    postData,
    trimmedContent.length,
  ]);

  const handlePostUpdate = async () => {
    if (!postData || !post?.data || !canSubmit) {
      return;
    }

    try {
      setIsPosting(true);

      const response = await updatePost(postData.data);

      if (!response) {
        Toast.show({ type: 'error', text1: t('posts.create.error') });
      }

      handlePostSuccess();
    } catch (error) {
      console.log('error', error);
      Toast.show({ type: 'error', text1: t('posts.create.error') });
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostSuccess = async () => {
    Toast.show({ type: 'success', text1: t('posts.edit.success') });
    navigation.navigate('TabNavigator', {
      screen: 'Feed',
    });
  };

  return (
    <ThemedSafeAreaView className="flex-1 bg-background">
      {isLoading && !postData ? (
        <ActivityIndicator />
      ) : (
        <>
          <GenericHeader
            title={t('posts.edit.title')}
            rightType="button"
            rightButtonTitle={
              isPosting
                ? t('posts.edit.loading')
                : attachmentsProcessing
                  ? t('posts.create.processing', 'Processing…')
                  : t('posts.edit.submit')
            }
            onRightButtonPress={handlePostUpdate}
            rightButtonDisabled={!canSubmit}
          />
          {postData && (
            <>
              {postData.type === 'article' && (
                <ArticleForm
                  postData={postData}
                  onChange={setPostData}
                  isEdit
                />
              )}
              {(postData.type === 'question' || postData.type === 'note') && (
                <PostForm
                  postData={postData}
                  setPostData={setPostData}
                  form={form}
                />
              )}
            </>
          )}
        </>
      )}
    </ThemedSafeAreaView>
  );
};
