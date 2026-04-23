import React, {useState} from 'react';
import {GenericHeader, GroupForm} from '../../../../components/custom';
import {zodResolver} from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import {useForm} from 'react-hook-form';
import {Form} from '../../../../components/ui/form';
import {GroupData, groupDataSchema, PublicProfile} from '@openpeeps/common';
import {useOpenpeeps} from '@openpeeps/react';
import {MainScreenProps} from '../../../../components/navigation/types';
import {uploadMedia} from '../../../../lib/uploadMedia';
import {ThemedSafeAreaView} from '../../../../components/ui/themed-safe-area-view';

type CreateGroupProps = MainScreenProps<'CreateGroup'>;
export const CreateGroup: React.FC<CreateGroupProps> = ({navigation}) => {
  const {openpeepsApi} = useOpenpeeps();
  const [isLoading, setIsLoading] = React.useState(false);
  const [members, setMembers] = React.useState<PublicProfile[]>([]);
  const createGroup = openpeepsApi.createGroupAction();
  const createAttachment = openpeepsApi.createMediaAttachmentAction();
  const [avatarImage, setAvatarImage] = useState<string>();
  const [headerImage, setHeaderImage] = useState<string>();

  const form = useForm<GroupData>({
    resolver: zodResolver(groupDataSchema),
    defaultValues: {
      displayName: undefined,
      handle: undefined,
      description: undefined,
      avatar: undefined,
      header: undefined,
      rules: undefined,
    },
  });

  async function onSubmit(values: GroupData) {
    try {
      setIsLoading(true);

      if (avatarImage !== undefined) {
        const avatar = await uploadMedia({
          mediaUri: avatarImage,
          createAttachments: createAttachment,
          type: 'image',
          usage: 'group-avatar',
        });

        values.avatar = avatar ? avatar?.url : undefined;
      }

      if (headerImage !== undefined) {
        const header = await uploadMedia({
          mediaUri: headerImage,
          createAttachments: createAttachment,
          type: 'image',
          usage: 'group-header',
        });
        values.header = header ? header?.url : undefined;
      }

      createGroup({
        ...values,
        members: members,
      })
        .then(async group => {
          Toast.show({
            type: 'success',
            text1: 'Group created successfully!',
          });
          navigation.pop();
          navigation.navigate('Group', {id: group.id});
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

  return (
    <Form {...form}>
      <ThemedSafeAreaView style={{flexGrow: 1}}>
        <GenericHeader
          title="Create group"
          rightButtonTitle={isLoading ? 'Creating...' : 'Create'}
          onRightButtonPress={form.handleSubmit(handleSubmit)}
          rightButtonDisabled={isLoading}
          rightType="button"
        />
        <GroupForm
          form={form}
          members={members}
          setMembers={setMembers}
          avatarImage={avatarImage}
          setAvatarImage={setAvatarImage}
          headerImage={headerImage}
          setHeaderImage={setHeaderImage}
        />
      </ThemedSafeAreaView>
    </Form>
  );
};
