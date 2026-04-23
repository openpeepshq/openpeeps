import React, { useEffect } from 'react';
import { ThemedView } from '~/components/ui/themed-view';
import {
  GenericHeader,
} from '~/components/custom';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { useForm } from 'react-hook-form';
import { ThemedText } from '~/components/ui/themed-text';
import { Form, FormField, FormCheckbox, FormInput } from '~/components/ui/form';
import { PostCreationData, postCreationDataSchema, PublicProfile } from '@openpeeps/common';
import { useOpenpeeps } from '@openpeeps/react';
import { MainScreenProps } from '~/components/navigation/types';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { useTranslation } from 'react-i18next';
import { VisibilityInput } from '~/components/custom/post/post-form/VisibilityInput';
import { ProfileInput } from '~/components/custom/common/profile-input';
type CreateNewJamProps = MainScreenProps<'CreateNewJam'>;

export const CreateNewJam: React.FC<CreateNewJamProps> = ({ navigation }) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { t } = useTranslation();

  const { data: serverInfo } = openpeepsApi.useServerInfo();

  const [isLoading, setIsLoading] = React.useState(false);
  const [moderators, setModerators] = React.useState<PublicProfile[]>([currentProfile!]);

  const createPost = openpeepsApi.createPostAction();

  const form = useForm<PostCreationData>({
    resolver: zodResolver(postCreationDataSchema),
    defaultValues: {
      type: 'event',
      visibility: serverInfo?.publicContent ? 'public' : 'local',
      data: {
        type: 'event',
        name: '',
        start: new Date().toISOString(),
        wholeDay: false,
        content: '',
        attendeeListPublic: false,
        jam: {
          videoEnabled: true,
          speakers: [],
          type: 'video-call',
          waitingRoom: false,
          moderators: [currentProfile!.id],
        },
      },
    },
  });

  useEffect(() => {
    form.setValue(
      'data.jam.moderators',
      moderators.map(m => m.id),
    );
  }, [moderators, form]);

  async function onSubmit(values: PostCreationData) {
    try {
      setIsLoading(true);
      const response = await createPost(values);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Jam created successfully',
      });
      navigation.navigate('JamSession', {
        jamId: response.id as string,
      });
    } catch (err) {
      if (err instanceof Error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: err.message,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'An unknown error occurred',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = async () => {
    await onSubmit(form.getValues());
  };

  return (
    <>
      <ThemedSafeAreaView style={{ flexGrow: 1 }}>
        <GenericHeader
          title={t('jams.create.title')}
          rightButtonTitle={isLoading ? 'Starting...' : 'Start Now'}
          onRightButtonPress={handleSubmit}
          rightButtonDisabled={isLoading}
        />
        <KeyboardAwareScrollView className="w-full flex bg-background relative p-2 px-4 gap-y-4">
          <Form {...form}>
            <ThemedView className="relative w-full mt-4">
              <FormField
                control={form.control}
                name="data.name"
                render={({ field }) => (
                  <FormInput
                    label={t('jams.form.name')}
                    placeholder={t('jams.form.name')}
                    {...field}
                    value={String(field.value) || ''}
                    className="rounded-md w-full"
                    autoCapitalize="none"
                  />
                )}
              />
            </ThemedView>
            <ThemedText className="mt-4 ">Visibility</ThemedText>
            <VisibilityInput
              type="event"
              audienceSetting={form.getValues()}
              onChange={value => {
                form.setValue('visibility', value.visibility);
                form.setValue('groupId', value.groupId);
                form.setValue('audience', value.audience);
              }}
              showDirect={true}
            />

            <ThemedText className="mt-4 ">{t('events.form.jamWaitingRoom')}</ThemedText>
            <ThemedView className="relative w-full mt-4">
              <FormField
                control={form.control}
                name="data.jam.waitingRoom"
                render={({ field }) => (
                  // @ts-ignore
                  <FormCheckbox
                    label={t('events.form.jamWaitingRoomDescription')}
                    {...field}
                    checked={Boolean(field.value) ?? false}
                    className="rounded-md w-full"
                    onCheckedChange={field.onChange}
                    handleOnLabelPress={() => { }}
                  />
                )}
              />
            </ThemedView>
            <ThemedText className="mt-4 ">{t('events.form.jamModerators')}</ThemedText>
            <ProfileInput
              defaultProfiles={[currentProfile!]}
              profiles={moderators}
              setProfiles={setModerators}
              label={t('events.form.jamModeratorsDescription')}
            />
          </Form>
        </KeyboardAwareScrollView>
      </ThemedSafeAreaView>
    </>
  );
};
