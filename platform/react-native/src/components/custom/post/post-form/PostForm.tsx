import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { UseFormReturn } from 'react-hook-form';
import { ProfileAvatar } from '../../profile/profile-avatar';
import { VisibilityInput } from './VisibilityInput';
import { AudienceSetting, PublicProfile } from '@openpeeps/common';
import { PostCreationData } from '@openpeeps/common';
import { Form, FormTextarea, FormField } from '../../../ui/form';
import { MediaPreview } from './MediaPreview';
import { cn, maxContentLength } from '../../../../lib/utils';
import { PollForm } from './PollForm';
import { useTranslation } from 'react-i18next';

import { useOpenpeeps } from '@openpeeps/react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ProfilePickerSheet } from '../../modals';

interface PostFormProps {
  canEditVisibility?: boolean;
  postData: PostCreationData;
  setPostData: (postData: PostCreationData) => void;
  form: UseFormReturn<PostCreationData>;
}

export const PostForm = ({
  canEditVisibility = false,
  postData,
  setPostData,
  form,
}: PostFormProps) => {
  const { currentProfile } = useOpenpeeps();
  const mentionsProfileModalRef = useRef<BottomSheetModal>(null);

  const { t } = useTranslation();

  const { subscribe } = form;

  useEffect(
    () =>
      subscribe({
        formState: {
          values: true,
        },
        callback: ({ values }: { values: PostCreationData }) => {
          setPostData(values);
        },
      }),
    [subscribe, setPostData],
  );

  const handleAudienceSelect = useCallback(
    (audienceSetting: AudienceSetting) => {
      const newPostData = { ...postData, ...audienceSetting };
      form.reset(newPostData);
      setPostData(newPostData);
    },
    [postData, form, setPostData],
  );

  const contentInputHeight = useMemo(
    () => (postData.data.type === 'question' ? '' : 'h-64'),
    [postData.data.type],
  );

  const handleProfileModalPress = useCallback(() => {
    mentionsProfileModalRef.current?.present();
  }, []);

  const handleProfileSelect = useCallback(
    (profiles: PublicProfile[]) => {
      const profile = profiles[0];
      const handle = `@${profile.handle}`;

      const currentContent = form.getValues('data.content') || '';
      const newContent = currentContent.replace(/@[^\s@]*$/, `${handle} `);

      const newPostData = {
        ...postData,
        mentions: [
          ...(postData.mentions ?? []),
          {
            text: profile.handle,
            profile,
          },
        ],
        data: {
          ...postData.data,
          content: newContent,
        },
      };

      form.reset(newPostData);
      setPostData(newPostData);
    },
    [form, postData, setPostData],
  );

  return (
    <>
      <Form {...form}>
        <View className="flex-row items-center p-4">
          <ProfileAvatar className="size-12" profile={currentProfile!} />
          <VisibilityInput
            audienceSetting={{
              visibility: postData.visibility,
              groupId: postData.groupId || undefined,
              audience: postData.audience || [],
            }}
            onChange={handleAudienceSelect}
            type="post"
            disabled={!canEditVisibility}
          />
        </View>

        {postData.data?.attachments && postData.data.attachments.length > 0 && (
          <MediaPreview
            attachments={postData.data.attachments}
            removeAttachment={index => {
              const newPostData = {
                ...postData,
                data: {
                  ...postData.data,
                  attachments: postData.data.attachments?.filter(
                    (_, i) => i !== index,
                  ),
                },
              };
              form.reset(newPostData);
              setPostData(newPostData);
            }}
            updateAttachment={(index, attachment) => {
              const newPostData = {
                ...postData,
                data: {
                  ...postData.data,
                  attachments: postData.data.attachments?.map((a, i) =>
                    i === index ? attachment : a,
                  ),
                },
              };
              form.reset(newPostData);
              setPostData(newPostData);
            }}
          />
        )}

        <FormField
          control={form.control}
          name={'data.content'}
          render={({field: {onChange, value, ...rest}}) => (
            <FormTextarea
              containerClassName={'w-full'}
              className={cn(
                'px-4 py-2 border-0 text-foreground ',
                contentInputHeight,
              )}
              placeholder={t('posts.form.content')}
              maxLength={maxContentLength}
              value={value}
              onChange={text => {
                onChange(text);

                // Check if the last character is "@"
                const lastChar = text?.slice(-1);
                if (lastChar === '@') {
                  handleProfileModalPress(); // Show modal
                }
              }}
              {...rest}
            />
          )}
        />
        {postData.data.type === 'question' && (
          <PollForm form={form} postData={postData} />
        )}

        <ProfilePickerSheet
          title="Select Mention"
          ref={mentionsProfileModalRef}
          onSelect={handleProfileSelect}
          selectType="sync"
          single={true}
        />
      </Form>
    </>
  );
};
