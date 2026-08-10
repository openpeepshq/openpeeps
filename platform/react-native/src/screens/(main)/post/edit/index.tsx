import React, {useEffect, useState} from 'react';
import {useOpenpeeps} from '@openpeepshq/react';
import {ArticleForm, GenericHeader} from '~/components/custom';
import Toast from 'react-native-toast-message';
import {ThemedSafeAreaView} from '~/components/ui/themed-safe-area-view';
import {PostForm} from '~/components/custom/post/post-form/PostForm';
import {useTranslation} from 'react-i18next';
import {MainScreenProps} from '~/components/navigation/types';
import {PostCreationData, postCreationDataSchema} from '@openpeepshq/common';
import {ActivityIndicator} from 'react-native';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {hasProcessingAttachments} from '~/lib/post';

type PostProps = MainScreenProps<'EditPost'>;

export const EditPost = ({route, navigation}: PostProps) => {
  const {id} = route.params;
  const {openpeepsApi} = useOpenpeeps();
  const {data: post, isLoading} = openpeepsApi.usePost(id);

  const [postData, setPostData] = useState<PostCreationData | undefined>(
    undefined,
  );

  const form = useForm<PostCreationData>({
    resolver: zodResolver(postCreationDataSchema),
    defaultValues: postData,
  });

  useEffect(() => {
    if (post?.data) {
      setPostData(postCreationDataSchema.parse(post));
      form.reset(postCreationDataSchema.parse(post));
    }
  }, [post, form, setPostData]);

  const {t} = useTranslation();

  const updatePost = openpeepsApi.updatePostAction({id: id});

  const [isPosting, setIsPosting] = useState(false);
  const attachmentsProcessing = hasProcessingAttachments(postData);

  const handlePostUpdate = async () => {
    if (!postData || !post?.data) {
      Toast.show({type: 'error', text1: t('posts.create.error')});
      return;
    }

    try {
      setIsPosting(true);

      const response = await updatePost(postData.data);

      if (!response) {
        Toast.show({type: 'error', text1: t('posts.create.error')});
      }

      handlePostSuccess();
    } catch (error) {
      console.log('error', error);
      Toast.show({type: 'error', text1: t('posts.create.error')});
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostSuccess = async () => {
    Toast.show({type: 'success', text1: t('posts.edit.success')});
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
            rightButtonDisabled={isPosting || attachmentsProcessing}
          />
          {postData && (
            <>
              {postData.type === 'article' && (
                <ArticleForm
                  postData={postData}
                  setPostData={setPostData}
                  canEditVisibility
                  form={form}
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
