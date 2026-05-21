import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Alert, Linking, Permission } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  MainStackParamList,
  TabStackParamList,
} from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeeps/react';
import {
  AudioPickerSheet,
  GenericHeader,
  ImagePickerSheet,
  VideoPickerSheet,
  DocumentPickerSheet,
  ArticleForm,
} from '~/components/custom';
import {
  MediaAttachment,
  PostCreationData,
  postCreationDataSchema,
  PublicProfile,
  VisibilityType,
} from '@openpeeps/common';
import { CompositeScreenProps } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { useLocalPostStore } from '~/stores/useLocalPostStore';
import { PostForm } from '~/components/custom/post/post-form/PostForm';
import { useTranslation } from 'react-i18next';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Footer from '~/components/custom/post/post-form/Footer';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { toArticle, toNote, toQuestion } from '~/lib/post';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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

  const postData = useLocalPostStore(state => state.postData);
  const setPostData = useLocalPostStore(state => state.setPostData);
  const resetPostData = useLocalPostStore(state => state.resetPostData);

  const imagePickerModalRef = useRef<BottomSheetModal>(null);
  const videoPickerModalRef = useRef<BottomSheetModal>(null);
  const audioPickerModalRef = useRef<BottomSheetModal>(null);
  const documentPickerModalRef = useRef<BottomSheetModal>(null);

  const [mediaPermissionsGranted] = useState(false);

  const form = useForm<PostCreationData>({
    resolver: zodResolver(postCreationDataSchema),
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
    } catch (error) {
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
        .map(g => g.group.id)
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
    const hasPermission = await checkMediaPermissions('file');
    if (hasPermission) {
      documentPickerModalRef.current?.present();
    }
  }, []);

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
      }

      else {
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
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('navigation.settings', 'Open Settings'),
          onPress: () => Linking.openSettings(),
        },
      ],
    );
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!route.params?.originatorId) {
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
    const triggeredFrm = route.params?.triggeredFrom;
    if (triggeredFrm === 'group') {
      const newPostData = {
        ...postData,
        groupId: route.params?.originatorId,
        visibility: 'group' as VisibilityType,
      };
      form.reset({
        ...newPostData,
        visibility: newPostData.visibility,
      });
      setPostData({
        ...newPostData,
        visibility: newPostData.visibility,
      });
    }
  }, [route, navigation]);

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
          isPosting ? t('posts.create.loading') : t('posts.create.submit')
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
        rightButtonDisabled={isPosting}
        onRightButtonPress={handlePostCreation}
      />
      <KeyboardAwareScrollView className="flex-1">
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
