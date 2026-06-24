import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useOpenpeeps} from '@openpeeps/react';
import {
  AudioPickerSheet,
  DocumentPickerSheet,
  type DocumentPickerSheetHandle,
  GenericHeader,
  ImagePickerSheet,
  ReplySheet,
  VideoPickerSheet,
} from '~/components/custom';
import {
  MediaAttachment,
  PostCreationData,
  postCreationDataSchema,
  PublicPost,
} from '@openpeeps/common';
import Toast from 'react-native-toast-message';
import {ThemedSafeAreaView} from '~/components/ui/themed-safe-area-view';
import {postDataDefaults, useLocalPostStore} from '~/stores/useLocalPostStore';
import {PostForm} from '~/components/custom/post/post-form/PostForm';
import {ThemedText} from '~/components/ui/themed-text';
import {
  ActivityIndicator,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  type Permission,
  TouchableWithoutFeedback,
} from 'react-native';
import {Button} from '~/components/ui/button';
import {MainScreenProps} from '~/components/navigation/types';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {useTranslation} from 'react-i18next';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Footer from '~/components/custom/post/post-form/Footer';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {hasProcessingAttachments, toArticle, toNote, toQuestion} from '~/lib/post';
import {FeedPost} from '~/components/custom/post/feed/chronological/FeedPost';

type PostProps = MainScreenProps<'ReplyPost'>;

export const ReplyPost = ({route, navigation}: PostProps) => {
  const {t} = useTranslation();
  const {id} = route.params;
  const {openpeepsApi, currentProfile} = useOpenpeeps();
  const {data: post, isLoading: isPostLoading} = openpeepsApi.usePost(id);

  const createPost = openpeepsApi.createPostAction();

  const [isPosting, setIsPosting] = useState(false);

  const replyModalRef = useRef<BottomSheetModal>(null);

  const handleReplyModalPress = useCallback(() => {
    replyModalRef.current?.present();
  }, []);

  const postData = useLocalPostStore(state => state.replyData[id]);
  const attachmentsProcessing = hasProcessingAttachments(postData);
  const setReplyData = useLocalPostStore(state => state.setReplyData);
  const setPostData = useCallback(
    (data: PostCreationData) => setReplyData(id, data),
    [id, setReplyData],
  );
  const resetReplyData = useLocalPostStore(state => state.resetReplyData);

  const form = useForm<PostCreationData>({
    resolver: zodResolver(postCreationDataSchema),
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
        membership => membership.group?.id === post.groupId,
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

  const handlePostCreation = async () => {
    if (!post) {
      Toast.show({type: 'error', text1: t('posts.create.error')});
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
    } catch (error) {
      Toast.show({type: 'error', text1: t('posts.create.error')});
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostSuccess = async () => {
    Toast.show({type: 'success', text1: t('posts.create.success')});
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
    const hasPermission = await checkMediaPermissions('photo');
    if (hasPermission) {
      imagePickerModalRef.current?.present();
    }
  }, []);

  const handleVideoModalPress = useCallback(async () => {
    const hasPermission = await checkMediaPermissions('video');
    if (hasPermission) {
      videoPickerModalRef.current?.present();
    }
  }, []);

  const handleAudioModalPress = useCallback(async () => {
    const hasPermission = await checkMediaPermissions('audio');
    if (hasPermission) {
      audioPickerModalRef.current?.present();
    }
  }, []);

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
    [postData, form, setPostData],
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

  const checkMediaPermissions = async (
    type: 'photo' | 'video' | 'audio' | 'file',
  ) => {
    if (Platform.OS !== 'android') return true;

    try {
      if (Number(Platform.Version) >= 33) {
        const permissions: Permission[] = [];

        if (type === 'photo')
          permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        if (type === 'video')
          permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO);
        if (type === 'audio')
          permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO);

        if (permissions.length === 0) return true;

        const statuses = await Promise.all(
          permissions.map(p => PermissionsAndroid.check(p)),
        );
        const allGranted = statuses.every(s => s === true);

        if (allGranted) return true;

        const requestResults = await PermissionsAndroid.requestMultiple(
          permissions,
        );
        const isGranted = Object.values(requestResults).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED,
        );

        if (!isGranted) {
          showPermissionAlert();
          return false;
        }
        return true;
      } else {
        const hasStorage = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );

        if (hasStorage) return true;

        const status = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );

        if (status === PermissionsAndroid.RESULTS.GRANTED) return true;

        showPermissionAlert();
        return false;
      }
    } catch (err) {
      console.warn('Permission check error:', err);
      return false;
    }
  };

  const showPermissionAlert = () => {
    Alert.alert(
      t('permissions.title', 'Permission Required'),
      t(
        'permissions.message',
        'Please allow access to your media library in settings to attach files.',
      ),
      [
        {text: t('common.cancel', 'Cancel'), style: 'cancel'},
        {
          text: t('navigation.settings', 'Open Settings'),
          onPress: () => Linking.openSettings(),
        },
      ],
    );
  };

  const handleDocumentModalPress = useCallback(async () => {
    const hasPermission = await checkMediaPermissions('file');
    if (hasPermission) {
      await documentPickerModalRef.current?.open();
    }
  }, []);

  return (
    <ThemedSafeAreaView className="flex-1 bg-background">
      <KeyboardAwareScrollView>
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
        {isPostLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <FeedPost
              post={post as PublicPost}
              showReplyTo={false}
              showMenu={false}
              showReactionHeader={false}
            />
            <Button
              variant={'link'}
              onPress={handleReplyModalPress}
              className=" items-start ">
              <ThemedText className="text-lg tracking-wider text-left">
                Replies
              </ThemedText>
            </Button>
            <ThemedText className="text-lg px-4 mb-2 text-muted-foreground tracking-wider ">
              Replying to{' '}
              <TouchableWithoutFeedback
                onPress={() => {}}
                className="inline-flex items-center ">
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
                    className="inline-flex items-center ">
                    <ThemedText className="text-lg text-blue-600">
                      {post.group.displayName}
                    </ThemedText>
                  </TouchableWithoutFeedback>
                </>
              )}
            </ThemedText>

            {postData ? (
              <PostForm
                postData={postData}
                setPostData={setPostData}
                form={form}
              />
            ) : (
              <ActivityIndicator />
            )}
          </>
        )}
        <ReplySheet ref={replyModalRef} onSelect={() => {}} id={id} />
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
