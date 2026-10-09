import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useOpenpeeps } from '@openpeepshq/react';
import {
  AudioPickerSheet,
  DocumentPickerSheet,
  type DocumentPickerSheetHandle,
  GenericHeader,
  ImagePickerSheet,
  VideoPickerSheet,
} from '../../components/custom/index';
import {
  MediaAttachment,
  PostCreationData,
  PublicPost,
} from '@openpeepshq/common';
import Toast from 'react-native-toast-message';
import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';
import {
  postDataDefaults,
  useLocalPostStore,
} from '../../stores/useLocalPostStore';
import { PostForm } from '../../components/post/post-form/PostForm';
import { ThemedText } from '../../components/ui/themed-text';
import { ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import { checkMediaPermissions } from '../../lib/media-permissions';
import { Button } from '../../components/ui/button';
import { MainScreenProps } from '../../components/navigation/types/index';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Footer from '../../components/post/post-form/Footer';
import { useForm } from 'react-hook-form';
import {
  hasProcessingAttachments,
  toArticle,
  toNote,
  toQuestion,
} from '../../lib/post';
import { CompactReplyParent } from '../../components/post/CompactReplyParent';

import { ReplyModal } from '../../components/post/index';
type PostProps = MainScreenProps<'ReplyPost'>;

export const ReplyPost = ({ route, navigation }: PostProps) => {
  const { t } = useTranslation();
  const { id } = route.params;
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { data: post, isLoading: isPostLoading } = openpeepsApi.usePost(id);

  const createPost = openpeepsApi.createPostAction();

  const [isPosting, setIsPosting] = useState(false);

  const replyModalRef = useRef<BottomSheetModal>(null);
  const scrollRef = useRef<KeyboardAwareScrollView>(null);

  const handleReplyModalPress = useCallback(() => {
    replyModalRef.current?.present();
  }, []);

  const postData = useLocalPostStore((state) => state.replyData[id]);
  const attachmentsProcessing = hasProcessingAttachments(postData);
  const setReplyData = useLocalPostStore((state) => state.setReplyData);
  const setPostData = useCallback(
    (data: PostCreationData) => setReplyData(id, data),
    [id, setReplyData]
  );
  const resetReplyData = useLocalPostStore((state) => state.resetReplyData);

  const form = useForm<PostCreationData>({
    defaultValues: postData,
  });

  useEffect(() => {
    if (post) {
      const baseData = postData ?? postDataDefaults(post.id);
      const newPostData = {
        ...baseData,
        data: {
          ...baseData.data,
          type: baseData.data?.type ?? 'note',
        },
        visibility: post.visibility,
        groupId: post.groupId ?? undefined,
        audience: post.audience,
      };
      setPostData(newPostData as PostCreationData);
      form.reset(newPostData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post]);

  useEffect(() => {
    if (post && post.groupId && currentProfile) {
      const isGroupMember = currentProfile.memberships?.some(
        (membership) => membership.group?.id === post.groupId
      );

      if (!isGroupMember) {
        Toast.show({
          type: 'error',
          text1: t('groups.error.notmember'),
        });
        navigation.goBack();
        return;
      }
    }
  }, [post, currentProfile, navigation, t]);

  const scrollToReplyForm = useCallback(() => {
    if (isPostLoading || !post || !postData) {
      return;
    }
    scrollRef.current?.scrollToEnd(false);
  }, [isPostLoading, post, postData]);

  const handlePostCreation = async () => {
    if (!post) {
      Toast.show({ type: 'error', text1: t('posts.create.error') });
      return;
    }

    try {
      setIsPosting(true);

      postData.inReplyToId = id;
      postData.visibility = post.visibility;
      postData.groupId = post.groupId ?? undefined;
      postData.audience = post.audience;

      await createPost(postData as PostCreationData);

      handlePostSuccess();
    } catch {
      Toast.show({ type: 'error', text1: t('posts.create.error') });
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostSuccess = async () => {
    Toast.show({ type: 'success', text1: t('posts.create.success') });
    resetReplyData(id);
    navigation.navigate('TabNavigator', {
      screen: 'Feed',
    });
  };

  const imagePickerModalRef = useRef<BottomSheetModal>(null);
  const videoPickerModalRef = useRef<BottomSheetModal>(null);
  const audioPickerModalRef = useRef<BottomSheetModal>(null);
  const documentPickerModalRef = useRef<DocumentPickerSheetHandle>(null);

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

  const handleDocumentModalPress = useCallback(async () => {
    const hasPermission = await checkMediaPermissions(t, 'file');
    if (hasPermission) {
      await documentPickerModalRef.current?.open();
    }
  }, [t]);

  return (
    <ThemedSafeAreaView className="flex-1 bg-background">
      <GenericHeader
        rightType="button"
        rightButtonTitle={
          isPosting
            ? t('posts.create.loading')
            : attachmentsProcessing
              ? t('posts.create.processing', 'Processing…')
              : t('posts.create.submit')
        }
        onRightButtonPress={handlePostCreation}
        rightButtonDisabled={isPosting || attachmentsProcessing}
      />
      <KeyboardAwareScrollView
        ref={scrollRef}
        className="flex-1"
        enableOnAndroid
        extraScrollHeight={80}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="pb-20"
        onKeyboardDidShow={scrollToReplyForm}
        onContentSizeChange={scrollToReplyForm}
      >
        {isPostLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <CompactReplyParent post={post as PublicPost} />
            <Button
              variant={'link'}
              onPress={handleReplyModalPress}
              className=" items-start "
            >
              <ThemedText className="text-lg tracking-wider text-left">
                Replies
              </ThemedText>
            </Button>
            <ThemedText className="text-lg px-4 mb-2 text-muted-foreground tracking-wider ">
              Replying to{' '}
              <TouchableWithoutFeedback
                onPress={() => {}}
                className="inline-flex items-center "
              >
                <ThemedText className="text-lg text-blue-600">
                  {`@${post?.profile.handle}`}
                </ThemedText>
              </TouchableWithoutFeedback>
              {post?.group && (
                <>
                  {' '}
                  in{' '}
                  <TouchableWithoutFeedback
                    onPress={() => {}}
                    className="inline-flex items-center "
                  >
                    <ThemedText className="text-lg text-blue-600">
                      {post.group.displayName}
                    </ThemedText>
                  </TouchableWithoutFeedback>
                </>
              )}
            </ThemedText>

            {postData ? (
              <PostForm
                autoFocus
                postData={postData}
                setPostData={setPostData}
                form={form}
              />
            ) : (
              <ActivityIndicator />
            )}
          </>
        )}
        <ReplyModal ref={replyModalRef} onSelect={() => {}} id={id} />
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
