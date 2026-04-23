import React from 'react';
import { GenericHeader } from '~/components/custom';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { useForm } from 'react-hook-form';
import { PostCreationData, postCreationDataSchema } from '@openpeeps/common';
import { useOpenpeeps } from '@openpeeps/react';
import { MainScreenProps } from '~/components/navigation/types';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { EventForm } from '~/components/custom/post';

type NewEventProps = MainScreenProps<'NewEvent'>;

export const NewEvent: React.FC<NewEventProps> = ({ navigation }) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const [isLoading, setIsLoading] = React.useState(false);
  const { data: serverInfo } = openpeepsApi.useServerInfo();

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

  async function onSubmit(values: PostCreationData) {
    try {
      setIsLoading(true);
      const response = await createPost(values);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Event created successfully',
      });
      navigation.pop();
      navigation.navigate('EventPage', {
        id: response.id,
      });
    } catch (err) {
      console.error('Submit error:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        // @ts-ignore
        text2: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ThemedSafeAreaView style={{ flexGrow: 1 }}>
      <GenericHeader
        title="Create event"
        rightButtonTitle={isLoading ? 'Creating...' : 'Create'}
        onRightButtonPress={form.handleSubmit(onSubmit)}
        rightButtonDisabled={isLoading}
      />
      <KeyboardAwareScrollView className="w-full flex bg-background relative p-2 px-4 gap-y-4">
        <EventForm form={form} />
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
