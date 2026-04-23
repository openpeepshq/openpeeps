import React, { useEffect, useState } from 'react';
import { GenericHeader, GroupForm } from '~/components/custom';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { useForm } from 'react-hook-form';
import { Form } from '~/components/ui/form';
import { GroupData, groupDataSchema } from '@openpeeps/common';
import { useOpenpeeps } from '@openpeeps/react';
import { MainScreenProps } from '~/components/navigation/types';
import { ActivityIndicator } from 'react-native';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';

type EditGroupDetailsProps = MainScreenProps<'EditGroupDetails'>;

export const EditGroupDetails = ({
  route,
  navigation,
}: EditGroupDetailsProps) => {
  const { id } = route.params;
  const { openpeepsApi } = useOpenpeeps();
  const {
    data: groupData,
    isLoading: isDataFetching,
    refetch,
  } = openpeepsApi.useGroup(id);
  const updateGroup = openpeepsApi.updateGroupAction({ id: id });
  const [isLoading, setIsLoading] = React.useState(false);
  const [avatarImage, setAvatarImage] = useState<string>();
  const [headerImage, setHeaderImage] = useState<string>();

  const form = useForm<GroupData>({
    resolver: zodResolver(groupDataSchema),
    defaultValues: {
      displayName: groupData?.displayName || undefined,
      handle: groupData?.handle || undefined,
      description: groupData?.description || undefined,
      avatar: groupData?.avatar || undefined,
      header: groupData?.header || undefined,
      rules: groupData?.rules || undefined,
    },
  });

  async function onSubmit(values: GroupData) {
    try {
      setIsLoading(true);
      updateGroup({
        ...values,
      })
        .then(async group => {
          Toast.show({
            type: 'success',
            text1: 'Group created successfully!',
          });
          await refetch();
          navigation.pop();
          navigation.navigate('Group', { id: group.id });
        })
        .catch(err => {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: err.message,
          });
        })
        .finally(() => setIsLoading(false));
    } catch (error) {
      setIsLoading(false);
      Toast.show({
        type: 'error',
        text1: 'Failed to create group',
      });
    }
  }

  const handleSubmit = async () => {
    const values = form.getValues();
    await onSubmit(values);
  };

  useEffect(() => {
    if (groupData) {
      form.setValue('displayName', groupData?.displayName);
      form.setValue('handle', groupData?.handle);
      form.setValue('description', groupData?.description);
      form.setValue('avatar', groupData?.avatar);
      form.setValue('header', groupData?.header);
      form.setValue('rules', groupData?.rules);
      setAvatarImage(groupData?.avatar || undefined);
      setHeaderImage(groupData?.header || undefined);
    }
  }, [groupData, form]);

  return (
    <Form {...form}>
      <ThemedSafeAreaView style={{ flexGrow: 1 }}>
        <GenericHeader
          title="Edit group"
          rightButtonTitle={isLoading ? 'Saving...' : 'Save'}
          onRightButtonPress={handleSubmit}
          rightButtonDisabled={isLoading}
          rightType="button"
        />
        {isDataFetching && <ActivityIndicator size={'small'} />}
        {!isDataFetching && (
          <GroupForm
            form={form}
            avatarImage={avatarImage}
            setAvatarImage={setAvatarImage}
            headerImage={headerImage}
            setHeaderImage={setHeaderImage}
          />
        )}
      </ThemedSafeAreaView>
    </Form>
  );
};
