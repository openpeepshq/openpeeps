import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { checkMediaPermissions } from '../../lib/media-permissions';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  MainStackParamList,
  TabStackParamList,
} from '../../components/navigation/types/index';
import { useOpenpeeps } from '@openpeepshq/react';
import {
  AudioPickerSheet,
  GenericHeader,
  ImagePickerSheet,
  DocumentPickerSheet,
  type DocumentPickerSheetHandle,
} from '../../components/custom/index';
import {
  checkRoleCapabilities,
  MediaAttachment,
  pollOptionsWithinLimit,
  PostCreationData,
  resolvePollOptionContents,
  VisibilityType,
} from '@openpeepshq/common';
import { CompositeScreenProps } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';
import { useLocalPostStore } from '../../stores/useLocalPostStore';
import { PostForm } from '../../components/post/post-form/PostForm';
import { useTranslation } from 'react-i18next';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Footer } from '../../components/post/post-form/Footer';
import { PostTypeSwitcher } from '../../components/post/post-form/PostTypeSwitcher';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { hasProcessingAttachments, toNote, toQuestion } from '../../lib/post';
import { useForm } from 'react-hook-form';

import { ArticleForm } from '../../components/post/index';
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
  const announcePost = openpeepsApi.admin.announcePostAction();
  const joinGroup = openpeepsApi.joinGroupAction();

  const [isPosting, setIsPosting] = useState(false);
  const [notify, setNotify] = useState(false);

  const postData = useLocalPostStore((state) => state.postData);
  const attachmentsProcessing = hasProcessingAttachments(postData);
  const setPostData = useLocalPostStore((state) => state.setPostData);
  const resetPostData = useLocalPostStore((state) => state.resetPostData);

  const imagePickerModalRef = useRef<BottomSheetModal>(null);
  const audioPickerModalRef = useRef<BottomSheetModal>(null);
  const documentPickerModalRef = useRef<DocumentPickerSheetHandle>(null);

  const form = useForm<PostCreationData>({
    defaultValues: postData,
  });

  const resetForm = useCallback(async () => {
    form.reset();
    setPostData(postData);
    resetPostData();
  }, [form, setPostData, resetPostData, postData]);

  const canNotify = useMemo(
    () =>
      checkRoleCapabilities(currentProfile?.roles ?? [], [
        'allpeep-core-admin-notify',
      ]).success,
    [currentProfile?.roles]
  );

  const showNotify =
    canNotify &&
    (postData.visibility === 'public' || postData.visibility === 'local');

  const trimmedContent = (postData.data.content ?? '').trim();
  const pollOptions =
    postData.data.type === 'question'
      ? postData.data.options.map((option) => option.content)
      : [];
  const resolvedPollOptions = resolvePollOptionContents(pollOptions, (index) =>
    t('posts.form.poll.option', { number: index + 1 })
  );
  const pollOptionsValid =
    resolvedPollOptions.length >= 2 &&
    pollOptionsWithinLimit(resolvedPollOptions);

  const canSubmit = useMemo(() => {
    if (isPosting || attachmentsProcessing) {
      return false;
    }
    if (postData.visibility === 'direct' && !postData.audience?.length) {
      return false;
    }
    if (postData.visibility === 'group' && !postData.groupId) {
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
    postData.audience?.length,
    postData.data.attachments?.length,
    postData.data.type,
    postData.groupId,
    postData.type,
    postData.visibility,
    trimmedContent.length,
  ]);

  const handlePostCreation = async () => {
    if (!canSubmit) {
      return;
    }

    try {
      setIsPosting(true);

      await handleGroupJoinIfNeeded();
      const response = await createPost(postData as PostCreationData);
      if (notify && canNotify && response?.id) {
        await announcePost({ id: response.id });
      }

      await handlePostSuccess();
    } catch {
      Toast.show({ type: 'error', text1: t('posts.create.errorGeneric') });
    } finally {
      setIsPosting(false);
    }
  };

  const handleGroupJoinIfNeeded = async () => {
    if (
      postData.visibility === 'group' &&
      postData.groupId &&
      !currentProfile?.memberships?.some(
        (membership) => membership.group.id === postData.groupId
      )
    ) {
      await joinGroup({ id: postData.groupId });
    }
  };

  const handlePostSuccess = async () => {
    Toast.show({ type: 'success', text1: t('posts.create.successToast') });
    await resetForm();

    if (postData.visibility === 'group' && postData.groupId) {
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

  const handleSelectComposerType = useCallback(
    (next: 'note' | 'question') => {
      if (postData.data.type === next) {
        return;
      }
      const newPostData =
        next === 'question' ? toQuestion(postData) : toNote(postData);
      form.reset(newPostData);
      setPostData(newPostData);
    },
    [postData, form, setPostData]
  );

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

  const isArticle = postData.type === 'article';
  const composerType = postData.data.type === 'question' ? 'question' : 'note';

  return (
    <ThemedSafeAreaView className="flex-1 bg-background">
      <GenericHeader
        title={
          isArticle ? t('articles.create.title') : t('posts.newPost.title')
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
        rightButtonDisabled={!canSubmit}
        onRightButtonPress={handlePostCreation}
      />
      <KeyboardAwareScrollView className="flex-1">
        {isArticle ? (
          <ArticleForm postData={postData} onChange={setPostData} />
        ) : (
          <PostForm
            postData={postData}
            setPostData={setPostData}
            canEditVisibility={route.params?.triggeredFrom !== 'group'}
            form={form}
            showNotify={showNotify}
            notify={notify}
            onNotifyChange={setNotify}
          />
        )}
      </KeyboardAwareScrollView>
      <Footer
        hideMedia={isArticle || composerType === 'question'}
        onImagePress={handleImageModalPress}
        onAudioPress={handleAudioModalPress}
        onDocumentPress={handleDocumentModalPress}
        typeSwitcher={
          <PostTypeSwitcher
            type={isArticle ? 'article' : composerType}
            onSelect={handleSelectComposerType}
            onClose={() => undefined}
            visibility={postData.visibility}
            groupId={postData.groupId ?? undefined}
          />
        }
      />
      <ImagePickerSheet
        ref={imagePickerModalRef}
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
