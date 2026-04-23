import React, {useCallback, useRef, useState} from 'react';
import {Pressable, View, Image} from 'react-native';
import {UseFormReturn} from 'react-hook-form';
import {MediaAttachment, Profile, PublicProfile} from '@openpeeps/common';
import {GroupData} from '@openpeeps/common';
import {FormField, FormInput, FormTextarea} from '../../ui/form';
import {useOpenpeeps} from '@openpeeps/react';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ImagePickerSheet, ProfilePickerSheet} from '../modals';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {ThemedView} from '../../ui/themed-view';
import {CameraIcon, PlusIcon, XIcon} from '../../icons';
import {Avatar, AvatarImage} from '../../ui/avatar';
import {ThemedText} from '../../ui/themed-text';
import {MiniProfileCard} from '../profile/profile-card';
import {Button} from '../../ui/button';

interface GroupFormProps {
  form: UseFormReturn<GroupData>;
  members?: PublicProfile[];
  setMembers?: (members: PublicProfile[]) => void;
  avatarImage: string | undefined;
  setAvatarImage: (avatarImage: string | undefined) => void;
  headerImage: string | undefined;
  setHeaderImage: (headerImage: string | undefined) => void;
}

export const GroupForm = ({
  form,
  members,
  setMembers,
  avatarImage,
  setAvatarImage,
}: GroupFormProps) => {
  const {currentProfile} = useOpenpeeps();
  const avatarImagePickerModalRef = useRef<BottomSheetModal>(null);
  const headerImagePickerModalRef = useRef<BottomSheetModal>(null);
  const profilePickerModalRef = useRef<BottomSheetModal>(null);
  const [headerImage, setHeaderImage] = useState<string>();
  const [isAvatarChanged, setIsAvatarChanged] = useState(false);
  const [isBackgroundChanged, setIsBackgroundChanged] = useState(false);

  const handleProfileSelect = useCallback(
    (profiles: Profile[]) => {
      setMembers &&
        setMembers(profiles.map(profile => profile as PublicProfile));
    },
    [setMembers],
  );

  const handleHeaderModalPress = useCallback(() => {
    headerImagePickerModalRef.current?.present();
  }, [headerImagePickerModalRef]);

  const handleAvatarModalPress = useCallback(() => {
    avatarImagePickerModalRef.current?.present();
  }, [avatarImagePickerModalRef]);

  const handleAvatarImageSelect = useCallback(
    (image: MediaAttachment[]) => {
      setAvatarImage(image[0].previewUrl || image[0].url);
      setIsAvatarChanged(true);
    },
    [setAvatarImage],
  );

  const handleHeaderImageSelect = useCallback(
    (image: MediaAttachment[]) => {
      setHeaderImage(image[0].previewUrl || image[0].url);
      setIsBackgroundChanged(true);
    },
    [setHeaderImage],
  );

  const handleProfileModalPress = useCallback(() => {
    profilePickerModalRef.current?.present();
  }, [profilePickerModalRef]);

  return (
    <>
      <KeyboardAwareScrollView className="w-full flex bg-background relative p-2 gap-y-4">
        {/* avatar and header */}
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
                    setHeaderImage('');
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
                isBackgroundChanged && headerImage
                  ? {uri: headerImage}
                  : form.getValues('header')
                  ? {uri: form.getValues('header')}
                  : require('../../../assets/images/group-header-placeholder.png')
              }
              className="w-full h-full rounded-md object-bottom absolute top-0"
              resizeMode="cover"
            />
          </View>
          <View className="z-10 absolute -bottom-10 mt-4 left-4">
            <View className="w-full h-full relative">
              <Avatar alt="profile" className=" size-28">
                {form.getValues('avatar') &&
                typeof form.getValues('avatar') !== 'undefined' ? (
                  <AvatarImage
                    source={
                      isAvatarChanged && avatarImage
                        ? {uri: avatarImage}
                        : form.getValues('avatar')
                        ? {uri: form.getValues('avatar')}
                        : require('../../../assets/images/default-group-avatar.png')
                    }
                  />
                ) : (
                  <AvatarImage
                    source={require('../../../assets/images/default-group-avatar.png')}
                  />
                )}
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
                    setAvatarImage('');
                    setIsAvatarChanged(false);
                    // form.setValue('avatar', undefined);
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

        <ThemedView className="relative w-full mt-16">
          <FormField
            control={form.control}
            name="displayName"
            render={({field}) => (
              <FormInput
                label="Group name"
                placeholder=""
                {...field}
                value={field.value || ''}
                className="rounded-md w-full"
                autoCapitalize="none"
              />
            )}
          />
        </ThemedView>

        <ThemedView className="relative w-full mt-4">
          <FormField
            control={form.control}
            name="handle"
            render={({field}) => (
              <FormInput
                label="Handle"
                placeholder=""
                {...field}
                value={field.value || ''}
                className="rounded-md w-full"
                autoCapitalize="none"
              />
            )}
          />
        </ThemedView>
        <ThemedView className="relative w-full  mt-4">
          <FormField
            control={form.control}
            name="description"
            render={({field}) => (
              <FormTextarea
                placeholder="What's the purpose of this group?"
                label="Description"
                {...field}
                value={field.value || ''}
                className="rounded-md"
              />
            )}
          />
        </ThemedView>
        <ThemedView className="relative w-full  mt-4">
          <FormField
            control={form.control}
            name="rules"
            render={({field}) => (
              <FormTextarea
                placeholder="Set the tone and expectations of your group"
                label="Rules"
                {...field}
                value={field.value || ''}
                className="rounded-md"
              />
            )}
          />
        </ThemedView>
        <ThemedView className="relative w-full pb-28">
          <Button
            onPress={handleProfileModalPress}
            variant={'outline'}
            className="flex-row gap-x-2 mb-4">
            <PlusIcon className="text-foreground" />
            <ThemedText>Add Members</ThemedText>
          </Button>

          {members && members.length > 0 && (
            <View className="flex flex-row gap-2 flex-wrap mb-4">
              <MiniProfileCard
                key={currentProfile?.id || 'profile'}
                profile={currentProfile as Profile}
                showAction={false}
              />
              {members.map(profile => (
                <MiniProfileCard
                  key={profile.id}
                  profile={profile}
                  onPress={() => {
                    const newProfiles = members.filter(
                      p => p.id !== profile.id,
                    );
                    setMembers && setMembers(newProfiles);
                  }}
                />
              ))}
            </View>
          )}
        </ThemedView>
      </KeyboardAwareScrollView>
      <ProfilePickerSheet
        ref={profilePickerModalRef}
        onSelect={handleProfileSelect}
        selectType="sync"
      />
      <ImagePickerSheet
        ref={avatarImagePickerModalRef}
        onSelect={handleAvatarImageSelect}
      />
      <ImagePickerSheet
        ref={headerImagePickerModalRef}
        onSelect={handleHeaderImageSelect}
      />
    </>
  );
};
