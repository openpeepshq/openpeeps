import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Image, Pressable, View} from 'react-native';
import {UseFormReturn} from 'react-hook-form';
import {VisibilityInput} from './VisibilityInput';
import {AudienceSetting, MediaAttachment} from '@openpeeps/common';
import {PostCreationData} from '@openpeeps/common';
import {Form, FormTextarea, FormField, FormInput} from '~/components/ui/form';
import {cn} from '~/lib/utils';
import {useTranslation} from 'react-i18next';

import {useOpenpeeps} from '@openpeeps/react';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ThemedView} from '~/components/ui/themed-view';
import {CameraIcon, XIcon} from '~/components/icons';
import {ThemedText} from '~/components/ui/themed-text';
import {Button} from '~/components/ui/button';
import {ImagePickerSheet} from '../../modals';
import ArticlePreviewSheet from './ArticlePreviewSheet';

interface ArticleFormProps {
  canEditVisibility?: boolean;
  postData: PostCreationData;
  setPostData: (postData: PostCreationData) => void;
  form: UseFormReturn<PostCreationData>;
}

export const ArticleForm = ({
  canEditVisibility = false,
  postData,
  setPostData,
  form,
}: ArticleFormProps) => {
  const {currentProfile} = useOpenpeeps();
  const [headerImage, setHeaderImage] = useState<string>();
  const [isBackgroundChanged, setIsBackgroundChanged] = useState(false);
  const headerImagePickerModalRef = useRef<BottomSheetModal>(null);
  const previewModalRef = useRef<BottomSheetModal>(null);

  const {t} = useTranslation();

  const {subscribe} = form;

  useEffect(
    () =>
      subscribe({
        formState: {
          values: true,
        },
        callback: ({values}: {values: PostCreationData}) => {
          setPostData(values);
        },
      }),
    [subscribe, setPostData],
  );

  const handleHeaderImageSelect = useCallback(
    (image: MediaAttachment[]) => {
      setHeaderImage(image[0].previewUrl || image[0].url);
      const newPostData = {
        ...postData,
        data: {
          ...postData.data,
          image: image[0].previewUrl || image[0].url,
        }
      };
      setIsBackgroundChanged(true);
      setPostData(newPostData);
    },
    [setHeaderImage],
  );

  const handleAudienceSelect = useCallback(
    (audienceSetting: AudienceSetting) => {
      const newPostData = {...postData, ...audienceSetting};
      form.reset(newPostData);
      setPostData(newPostData);
    },
    [postData, form, setPostData],
  );

  const handleHeaderModalPress = useCallback(() => {
    headerImagePickerModalRef.current?.present();
  }, [headerImagePickerModalRef]);

  const handlePreviewModalPress = useCallback(() => {
    previewModalRef.current?.present();
  }, [previewModalRef]);

  return (
    <View className="px-4">
      <Form {...form}>
        <ThemedView className="w-full relative h-[250px]">
          <View className="w-full h-full flex items-center justify-center relative ">
            {isBackgroundChanged ? (
              <View className="flex flex-row gap-x-2 z-30">
                <Pressable
                  className="bg-black/40 p-2 rounded-full"
                  onPress={() => setIsBackgroundChanged(false)}>
                  <CameraIcon className="text-foreground" />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setHeaderImage('');
                    setIsBackgroundChanged(false);
                  }}
                  className="bg-black/40 p-2 rounded-full">
                  <XIcon className="text-foreground" />
                </Pressable>
              </View>
            ) : (
              <View className="flex flex-col items-center gap-x-2 z-30">
                <Pressable
                  className="bg-black/40 flex items-center justify-center rounded-full size-12"
                  onPress={() => {
                    handleHeaderModalPress();
                  }}>
                  <CameraIcon className="text-foreground" />
                </Pressable>
                <ThemedText className="font-bold">
                  Upload your cover image
                </ThemedText>
                <ThemedText className="">
                  Minimum width 480 pixels
                </ThemedText>
              </View>
            )}

            <Image
              source={
                isBackgroundChanged && headerImage
                  ? {uri: headerImage}
                  : form.getValues('data.image')
                  ? {uri: form.getValues('data.image')}
                  : require('~/assets/images/group-header-placeholder.png')
              }
              className="w-full h-full rounded-md object-bottom absolute top-0"
              resizeMode="cover"
            />
          </View>
        </ThemedView>

        <ThemedView className="relative mt-6">
          <ThemedText className=" text-xl font-semibold tracking-wider">
            {t('articles.form.title')}
          </ThemedText>
          <FormField
            control={form.control}
            name="data.title"
            render={({field}) => (
              <FormInput
                placeholder={t('articles.form.title')}
                className="rounded-md w-full"
                {...field}
                value={field.value}
              />
            )}
          />
        </ThemedView>

        <View className="mt-6">
          <ThemedText className=" text-xl font-semibold tracking-wider">
            {t('articles.form.content')}
          </ThemedText>
          <Button variant="ghost" onPress={handlePreviewModalPress}>
            <ThemedText>Preview</ThemedText>
          </Button>
          <FormField
            control={form.control}
            name={'data.content'}
            render={({field: {onChange, value, ...rest}}) => (
              <FormTextarea
                containerClassName={'w-full'}
                className={cn('px-4 py-2 text-foreground min-h-64')}
                placeholder={t('articles.form.contentPlaceholder')}
                maxLength={10000}
                value={value}
                onChange={text => {
                  onChange(text);
                }}
                {...rest}
              />
            )}
          />
        </View>

        <View className="mt-6">
          <ThemedText className=" text-xl font-semibold tracking-wider">
            {t('articles.form.visibility')}
          </ThemedText>
          <VisibilityInput
            disabled={!canEditVisibility}
            audienceSetting={form.getValues()}
            type="post"
            onChange={handleAudienceSelect}
          />
        </View>
      </Form>
      <ImagePickerSheet
        ref={headerImagePickerModalRef}
        onSelect={handleHeaderImageSelect}
      />
      <ArticlePreviewSheet
        ref={previewModalRef}
        content={postData.data.content || ''}
      />
    </View>
  );
};
