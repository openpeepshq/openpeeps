import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ThemedView } from '~/components/ui/themed-view';
import { useOpenpeeps } from '@openpeeps/react';
import { ThemedText } from '~/components/ui/themed-text';
import { useForm } from 'react-hook-form';
import {
  MediaAttachment,
  Profile,
  ProfileData,
  profileSchema,
} from '@openpeeps/common';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Avatar, AvatarImage } from '~/components/ui/avatar';
import { Form, FormField, FormInput, FormTextarea } from '~/components/ui/form';
import Toast from 'react-native-toast-message';
import { ImagePickerSheet } from '~/components/custom';
import { CameraIcon, XIcon } from '~/components/icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Button } from '~/components/ui/button';
import { useTranslation } from 'react-i18next';

type EditProfileFormProps = {
  handle: string;
};

export const EditProfileForm: React.FC<EditProfileFormProps> = ({ handle }) => {
  const { openpeepsApi, queryClient } = useOpenpeeps();
  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const {
    data: profileData,
    isLoading,
    refetch,
  } = openpeepsApi.useProfileByHandle(handle);
  const [isBackgroundChanged, setIsBackgroundChanged] = useState(false);
  const [isAvatarChanged, setIsAvatarChanged] = useState(false);
  const [newBackground, setNewBackground] = useState<string>();
  const [newAvatar, setNewAvatar] = useState<string>();
  const avatarImagePickerModalRef = useRef<BottomSheetModal>(null);
  const headerImagePickerModalRef = useRef<BottomSheetModal>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const form = useForm<Profile>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      avatar: profileData?.avatar || undefined,
      header: profileData?.header || undefined,
      displayName: profileData?.displayName || undefined,
      bio: profileData?.bio || undefined,
      location: (profileData as ProfileData)?.location || { text: '' },
      ...profileData,
      fields: profileData?.fields || [],
    },
  });

  useEffect(() => {
    const customFields =
      serverInfo &&
      serverInfo.communityConfig?.profiles?.additionalFields &&
      serverInfo.communityConfig.profiles?.additionalFields.map(fld => ({
        name: fld.label,
        value: profileData?.fields?.find(field => field.name === fld.label)
          ?.value,
      }));

    if (profileData) {
      form.reset({
        avatar: profileData.avatar || undefined,
        header: profileData.header || undefined,
        displayName: profileData.displayName || '',
        bio: profileData.bio || '',
        location: (profileData as ProfileData)?.location || { text: '' },
        fields: customFields || [],
        handle,
      });
    }
  }, [profileData, form, handle, serverInfo]);

  const updateProfileDetails = openpeepsApi.updateCurrentProfileAction();

  const onSubmit = async (values: ProfileData) => {
    setIsSubmitting(true);

    values.type = profileData?.type || 'local';

    if (newAvatar !== undefined) {

      values.avatar = newAvatar;
    }
    if (newBackground !== undefined) {

      values.header = newBackground;
    }



    values.fields = values.fields?.filter(field => !!field.value);

    updateProfileDetails(values)
      .then(async response => {
        console.log('response', response);
        Toast.show({
          type: 'success',
          text2: t('profile.edit.success'),
        });
        setIsAvatarChanged(false);
        setIsBackgroundChanged(false);
        setNewAvatar(undefined);
        setNewBackground(undefined);
        await queryClient.invalidateQueries({
          queryKey: ['profile', handle],
        });
        await refetch();
      })
      .catch(err => {
        console.log('response', err);
        Toast.show({
          type: 'error',
          text1: t('common.errors.error'),
          text2: err.message,
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };
  const handleSubmit = async () => {
    const values = form.getValues();
    console.log('values', values);
    await onSubmit(values);
  };

  const handleAvatarModalPress = useCallback(() => {
    avatarImagePickerModalRef.current?.present();
  }, []);

  const handleAvatarImageSelect = useCallback(
    (attachments: MediaAttachment[]) => {
      setNewAvatar(attachments[0].previewUrl || attachments[0].url);
      setIsAvatarChanged(true);
    },
    [],
  );

  const handleHeaderModalPress = useCallback(() => {
    headerImagePickerModalRef.current?.present();
  }, []);

  const handleHeaderImageSelect = useCallback(
    (attachments: MediaAttachment[]) => {
      setNewBackground(attachments[0].previewUrl || attachments[0].url);
      setIsBackgroundChanged(true);
    },
    [],
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="w-full flex">
        <Form {...form}>
          {isLoading && <ActivityIndicator size={'small'} />}
          {!isLoading && (
            <>
              <ThemedView className="w-full p-2 relative rounded-md h-[250px]">
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
                          setNewBackground('');
                          setIsBackgroundChanged(false);
                        }}
                        className="bg-black/40 p-2 rounded-full">
                        <XIcon className="text-foreground" />
                      </Pressable>
                    </View>
                  ) : (
                    <View className="flex flex-row gap-x-2 z-30">
                      <Pressable
                        className="bg-black/40 p-2 rounded-full"
                        onPress={() => {
                          handleHeaderModalPress();
                        }}>
                        <CameraIcon className="text-foreground" />
                      </Pressable>
                    </View>
                  )}
                  <Image
                    source={
                      isBackgroundChanged && newBackground
                        ? { uri: newBackground }
                        : form.getValues('header')
                          ? { uri: form.getValues('header') }
                          : require('~/assets/images/profile-background-placeholder.png')
                    }
                    className="w-full h-full rounded-md object-bottom absolute top-0"
                    resizeMode="cover"
                  />
                </View>
                <View className="z-10 absolute -bottom-10 mt-4 left-4">
                  <View className="w-full h-full relative">
                    <Avatar
                      alt={t('profile.header.avatarAlt')}
                      className=" size-28">
                      <AvatarImage
                        source={
                          isAvatarChanged && newAvatar
                            ? { uri: newAvatar }
                            : form.getValues('avatar')
                              ? { uri: form.getValues('avatar') }
                              : require('~/assets/images/black-ambition-2025-hero.png')
                        }
                      />
                    </Avatar>
                  </View>
                  {isAvatarChanged ? (
                    <View className="absolute bottom-10 right-0  flex flex-row gap-x-2">
                      <Pressable
                        onPress={handleAvatarModalPress}
                        className="bg-black/40 p-2 rounded-full">
                        <CameraIcon className="text-foreground" />
                      </Pressable>
                      <Pressable
                        className="bg-black/40 p-2 rounded-full"
                        onPress={() => {
                          setNewAvatar('');
                          setIsAvatarChanged(false);
                        }}>
                        <XIcon className="text-foreground" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      className="absolute bottom-10 right-10 bg-black/40 p-2 rounded-full  flex flex-row gap-x-2"
                      onPress={handleAvatarModalPress}>
                      <CameraIcon className="text-foreground" />
                    </Pressable>
                  )}
                </View>
              </ThemedView>
              <ThemedView className="mt-12 gap-7 mb-4 p-5 w-full flex-1  items-center rounded-md">
                <View className="relative w-full">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormInput
                        label={t('profile.form.displayName')}
                        placeholder={t('profile.form.displayName')}
                        {...field}
                        value={field.value || ''}
                        className="rounded-md"
                        autoCapitalize="none"
                      />
                    )}
                  />
                </View>

                <View className="relative w-full">
                  <FormField
                    control={form.control}
                    name="handle"
                    render={({ field }) => (
                      <FormInput
                        label="Handle"
                        placeholder=""
                        {...field}
                        value={field.value || ''}
                        className="rounded-md"
                      />
                    )}
                  />
                </View>

                <View className="relative w-full">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormTextarea
                        label={t('profile.form.bio')}
                        placeholder={t('profile.form.bioPlaceholder')}
                        {...field}
                        value={field.value || ''}
                        className="rounded-md"
                      />
                    )}
                  />
                </View>
                <View className="relative w-full">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormInput
                        label="Location"
                        placeholder=""
                        {...field}
                        value={field.value?.text || ''}
                        onChangeText={text => field.onChange({ text: text })}
                        className="rounded-md"
                      />
                    )}
                  />
                </View>
                {serverInfo?.communityConfig.profiles?.additionalFields?.map(
                  (field, index) => {
                    return (
                      <View className="w-full" key={index + 'view'}>
                        <FormField
                          control={form.control}
                          name={`fields.${index}.value`}
                          render={({ field: formField }) => (
                            <FormInput
                              label={field.label}
                              placeholder={field.label}
                              {...formField}
                              className="w-full"
                            />
                          )}
                        />
                      </View>
                    );
                  },
                )}
              </ThemedView>
              <Button
                className="w-[85%] mx-auto mt-4"
                disabled={isSubmitting}
                onPress={handleSubmit}>
                {isSubmitting ? (
                  <ActivityIndicator size={'small'} />
                ) : (
                  <ThemedText className="text-base font-semibold text-center">
                    {t('profile.edit.save')}
                  </ThemedText>
                )}
              </Button>
            </>
          )}
        </Form>
      </KeyboardAwareScrollView>
      <ImagePickerSheet
        ref={avatarImagePickerModalRef}
        onSelect={handleAvatarImageSelect}
      />
      <ImagePickerSheet
        ref={headerImagePickerModalRef}
        onSelect={handleHeaderImageSelect}
      />
    </ThemedView>
  );
};
