import React, { useCallback, useEffect, useRef, useState } from 'react';
import { checkMediaPermissions } from '~/lib/media-permissions';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  MainStackParamList,
  TabStackParamList,
} from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeepshq/react';
import {
  AudioPickerSheet,
  GenericHeader,
  ImagePickerSheet,
  VideoPickerSheet,
  DocumentPickerSheet,
  type DocumentPickerSheetHandle,
} from '~/components/custom';
import {
  MediaAttachment,
  PostCreationData,
  PublicProfile,
  VisibilityType,
} from '@openpeepshq/common';
import { CompositeScreenProps } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { useLocalPostStore } from '~/stores/useLocalPostStore';
import { PostForm } from '~/components/post/post-form/PostForm';
import { useTranslation } from 'react-i18next';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Footer from '~/components/post/post-form/Footer';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  hasProcessingAttachments,
  toArticle,
  toNote,
  toQuestion,
} from '~/lib/post';
import { useForm } from 'react-hook-form';

import { ArticleForm } from '~/components/post';
type PostProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'NewPost'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const NewPost = ({ route, navigation }: PostProps) => {
  const { t } = useTranslation();
  const { openpeepsApi, currentProfile } = useOpenpeeps();

  const { data: server } = openpeepsApi.useServerInfo();
  const publicContent = !!server?.publicContent;

  const createPost = openpeepsApi.createPostAction();

  const [isPosting, setIsPosting] = useState(false);

  const postData = useLocalPostStore((state) => state.postData);
  const attachmentsProcessing = hasProcessingAttachments(postData);
  const setPostData = useLocalPostStore((state) => state.setPostData);
  const resetPostData = useLocalPostStore((state) => state.resetPostData);

  const imagePickerModalRef = useRef<BottomSheetModal>(null);
  const videoPickerModalRef = useRef<BottomSheetModal>(null);
  const audioPickerModalRef = useRef<BottomSheetModal>(null);
  const documentPickerModalRef = useRef<DocumentPickerSheetHandle>(null);

  const form = useForm<PostCreationData>({
    defaultValues: postData,
  });

  const joinGroup = openpeepsApi.addGroupMemberAction();

  const resetForm = useCallback(async () => {
    form.reset();
    setPostData(postData);
    resetPostData();
  }, [form, setPostData, resetPostData, postData]);

  const handlePostCreation = async () => {
    try {
      setIsPosting(true);

      await handleGroupJoinIfNeeded();
      await createPost(postData as PostCreationData);

      await handlePostSuccess();
    } catch {
      Toast.show({ type: 'error', text1: t('posts.create.error') });
    } finally {
      setIsPosting(false);
    }
  };

  const handleGroupJoinIfNeeded = async () => {
    if (
      postData.visibility === 'group' &&
      postData.groupId &&
      !currentProfile?.memberships
        .map((g) => g.group.id)
        .includes(postData.groupId)
    ) {
      await joinGroup({
        ...(currentProfile as PublicProfile),
      });
    }
  };

  const handlePostSuccess = async () => {
    Toast.show({ type: 'success', text1: t('posts.create.success') });

    if (postData.visibility === 'group' && postData.groupId) {
      resetForm();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      navigation.navigate('Group', {
        id: postData.groupId,
      });
    } else {
      navigation.navigate('Feed');
    }
  };

  const handleDocumentModalPress = useCallback(async () => {
    const hasPermission = await checkMediaPermissions(t, 'file');
    if (hasPermission) {
      await documentPickerModalRef.current?.open();
    }
  }, [t]);

  const handleImageModalPress = useCallback(async () => {
    const hasPermission = await checkMediaPermissions(t, 'photo');
    if (hasPermission) {
      imagePickerModalRef.current?.present();
    }
  }, [t]);

  const handleVideoModalPress = useCallback(async () => {
    const hasPermission = await checkMediaPermissions(t, 'video');
    if (hasPermission) {
      videoPickerModalRef.current?.present();
    }
  }, [t]);

  const handleAudioModalPress = useCallback(async () => {
    const hasPermission = await checkMediaPermissions(t, 'audio');
    if (hasPermission) {
      audioPickerModalRef.current?.present();
    }
  }, [t]);

  const handleAddAttachments = useCallback(
    (attachments: MediaAttachment[]) => {
      const newPostData = {
        ...postData,
        data: {
          ...postData.data,
          attachments: [...(postData.data.attachments ?? []), ...attachments],
        },
      };
      form.reset(newPostData);
      setPostData(newPostData);
    },
    [postData, form, setPostData]
  );

  const handleSwitchPollPress = useCallback(() => {
    const newPostData =
      postData.data.type === 'question'
        ? toNote(postData)
        : toQuestion(postData);
    form.reset(newPostData);
    setPostData(newPostData);
  }, [postData, form, setPostData]);

  const handleSwithToArticlePress = useCallback(() => {
    const newPostData =
      postData.type === 'article' ? toNote(postData) : toArticle(postData);
    form.reset(newPostData);
    setPostData(newPostData);
  }, [postData, form, setPostData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!route.params?.originatorId && !route.params?.withContent) {
        resetForm();
      }
    });

    return unsubscribe;
  }, [navigation, route, resetForm]);

  useEffect(() => {
    if (!publicContent && postData.visibility === 'public') {
      setPostData({ ...postData, visibility: 'local' });
    }
  }, [postData, setPostData, publicContent]);

  useEffect(() => {
    if (route.params?.triggeredFrom !== 'group') {
      return;
    }
    // Read the store imperatively: subscribing to postData here would re-run
    // the effect on every change it makes itself.
    const newPostData = {
      ...useLocalPostStore.getState().postData,
      groupId: route.params?.originatorId,
      visibility: 'group' as VisibilityType,
    };
    form.reset(newPostData);
    setPostData(newPostData);
  }, [route, form, setPostData]);

  return (
    <ThemedSafeAreaView className="flex-1 bg-background">
      <GenericHeader
        title={
          postData.data.type === 'article'
            ? t('articles.create.title')
            : postData.data.type === 'question'
              ? t('posts.create.title')
              : t('posts.create.title')
        }
        rightType="button"
        rightButtonTitle={
          isPosting
            ? t('posts.create.loading')
            : attachmentsProcessing
              ? t('posts.create.processing', 'Processing…')
              : t('posts.create.submit')
        }
        handleGoBack={() => {
          if (route.params?.triggeredFrom === 'group') {
            navigation.pop();
            navigation.navigate('Group', {
              id: route.params?.originatorId!,
            });
          } else {
            navigation.goBack();
          }
        }}
        rightButtonDisabled={isPosting || attachmentsProcessing}
        onRightButtonPress={handlePostCreation}
      />
      <KeyboardAwareScrollView className="flex-1">
        {postData.type === 'article' && (
          <ArticleForm postData={postData} onChange={setPostData} />
        )}
        {(postData.type === 'question' || postData.type === 'note') && (
          <PostForm
            postData={postData}
            setPostData={setPostData}
            canEditVisibility
            form={form}
          />
        )}
      </KeyboardAwareScrollView>
      <Footer
        content={postData}
        postType={postData?.data?.type}
        onImagePress={handleImageModalPress}
        onMicPress={handleAudioModalPress}
        onVideoPress={handleVideoModalPress}
        onPollPress={handleSwitchPollPress}
        onDocumentPress={handleDocumentModalPress}
        onArticlePress={handleSwithToArticlePress}
      />
      <ImagePickerSheet
        ref={imagePickerModalRef}
        onSelect={handleAddAttachments}
      />
      <VideoPickerSheet
        ref={videoPickerModalRef}
        onSelect={handleAddAttachments}
      />
      <AudioPickerSheet
        ref={audioPickerModalRef}
        onSelect={handleAddAttachments}
      />
      <DocumentPickerSheet
        ref={documentPickerModalRef}
        onSelect={handleAddAttachments}
      />
    </ThemedSafeAreaView>
  );
};
