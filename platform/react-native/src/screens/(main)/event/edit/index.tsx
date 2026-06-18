import React from 'react';
import { GenericHeader } from '~/components/custom';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { useForm } from 'react-hook-form';
import { PostCreationData, postCreationDataSchema } from '@openpeeps/common';
import { normalizeEventDataForSave } from '@openpeeps/common/lib';
import { useOpenpeeps } from '@openpeeps/react';
import { MainScreenProps } from '~/components/navigation/types';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { EventForm } from '~/components/custom/post';

type EditEventProps = MainScreenProps<'EditEvent'>;

export const EditEvent = ({ route, navigation }: EditEventProps) => {
  const { id } = route.params;
  const { openpeepsApi } = useOpenpeeps();
  const { data: post, isLoading: isPostLoading } = openpeepsApi.usePost(id);
  const [isLoading, setIsLoading] = React.useState(false);

  const updatePost = openpeepsApi.updatePostAction({ id: post?.id || '' });

  const form = useForm<PostCreationData>({
    resolver: zodResolver(postCreationDataSchema),
    defaultValues: post
      ? {
        ...post,
        groupId: post.groupId ?? undefined,
        inReplyToId: post.inReplyToId ?? undefined,
      }
      : undefined,
  });

  async function onSubmit() {
    try {
      setIsLoading(true);
      const data = form.getValues('data');
      const response = await updatePost(
        data.type === 'event'
          ? normalizeEventDataForSave(data)
          : data,
      );
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
        title="Edit Event"
        rightButtonTitle={isLoading || isPostLoading ? 'Editing...' : 'Edit'}
        onRightButtonPress={form.handleSubmit(onSubmit)}
        rightButtonDisabled={isLoading || isPostLoading}
      />
      <KeyboardAwareScrollView className="w-full flex bg-background relative p-2 px-4 gap-y-4">
        <EventForm form={form} isEdit={true} />
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
