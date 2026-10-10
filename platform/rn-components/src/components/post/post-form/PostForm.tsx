import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { UseFormReturn } from 'react-hook-form';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { AudienceSetting, type PostCreationData } from '@openpeepshq/common';
import { audienceSummary, useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { ProfileAvatar } from '../../profile/Avatar';
import { ThemedText } from '../../ui/themed-text';
import { Switch } from '../../ui/switch';
import { ChevronDownIcon, MegaphoneIcon } from '../../icons/index';
import { ComposeAttachments } from './ComposeAttachments';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import { PollComposerFields } from './PollComposerFields';
import { VisibilitySheet } from './VisibilitySheet';

interface PostFormProps {
  autoFocus?: boolean;
  canEditVisibility?: boolean;
  postData: PostCreationData;
  setPostData: (postData: PostCreationData) => void;
  form: UseFormReturn<PostCreationData>;
  showNotify?: boolean;
  notify?: boolean;
  onNotifyChange?: (value: boolean) => void;
}

export const PostForm = ({
  autoFocus = false,
  canEditVisibility = false,
  postData,
  setPostData,
  form,
  showNotify = false,
  notify = false,
  onNotifyChange,
}: PostFormProps) => {
  const { currentProfile } = useOpenpeeps();
  const { t } = useTranslation();
  const visibilityModalRef = useRef<BottomSheetModal>(null);
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
    [subscribe, setPostData]
  );

  const handleAudienceSelect = useCallback(
    (audienceSetting: AudienceSetting) => {
      const newPostData = { ...postData, ...audienceSetting };
      form.reset(newPostData);
      setPostData(newPostData);
    },
    [postData, form, setPostData]
  );

  const selectedGroupName = useMemo(() => {
    if (!postData.groupId) {
      return undefined;
    }
    return currentProfile?.memberships?.find(
      (membership) => membership.group.id === postData.groupId
    )?.group.displayName;
  }, [currentProfile?.memberships, postData.groupId]);

  const content = form.watch('data.content') ?? '';
  const isQuestion = postData.data.type === 'question';
  const isNote = postData.data.type === 'note';

  return (
    <View className="px-4 pb-4">
      {currentProfile ? (
        <Pressable
          disabled={!canEditVisibility}
          accessibilityLabel={t('posts.form.changeAudience')}
          onPress={() => visibilityModalRef.current?.present()}
          className="mb-3 w-full flex-row items-center gap-3 rounded-md border border-border p-3"
        >
          <ProfileAvatar className="size-10" profile={currentProfile} />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1">
              <ThemedText className="font-medium" numberOfLines={1}>
                {currentProfile.displayName ?? currentProfile.handle}
              </ThemedText>
              {canEditVisibility ? (
                <ChevronDownIcon size={16} className="text-muted-foreground" />
              ) : null}
            </View>
            <ThemedText className="text-sm text-muted-foreground">
              {audienceSummary(
                postData.visibility,
                t,
                selectedGroupName,
                postData.audience?.length
              )}
            </ThemedText>
          </View>
        </Pressable>
      ) : null}

      <OpenpeepsMarkdownInput
        autoFocus={autoFocus}
        value={content}
        onChange={(text) => form.setValue('data.content', text)}
        placeholder={
          isQuestion
            ? t('posts.form.poll.question')
            : t('posts.form.note.placeholder')
        }
      />

      <ComposePreviewLinks content={content} />

      {isNote && (postData.data.attachments?.length ?? 0) > 0 ? (
        <ComposeAttachments
          attachments={postData.data.attachments ?? []}
          removeAttachment={(index) => {
            const newPostData = {
              ...postData,
              data: {
                ...postData.data,
                attachments: postData.data.attachments?.filter(
                  (_, i) => i !== index
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
                attachments: postData.data.attachments?.map((item, i) =>
                  i === index ? attachment : item
                ),
              },
            };
            form.reset(newPostData);
            setPostData(newPostData);
          }}
        />
      ) : null}

      {isQuestion ? (
        <PollComposerFields form={form} postData={postData} />
      ) : null}

      {showNotify ? (
        <View className="flex-row items-center justify-between py-3">
          <View className="flex-row items-center gap-2">
            <MegaphoneIcon size={20} className="text-foreground" />
            <ThemedText className="text-base">
              {t('posts.form.notifyEveryone')}
            </ThemedText>
          </View>
          <Switch
            checked={notify}
            onCheckedChange={onNotifyChange ?? (() => undefined)}
          />
        </View>
      ) : null}

      <VisibilitySheet
        type="post"
        ref={visibilityModalRef}
        showDirect
        audienceSetting={{
          visibility: postData.visibility,
          groupId: postData.groupId || undefined,
          audience: postData.audience || [],
        }}
        onSubmit={handleAudienceSelect}
      />
    </View>
  );
};
