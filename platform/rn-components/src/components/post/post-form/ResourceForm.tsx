import React, { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type {
  AudienceSetting,
  MediaAttachment,
  PostCreationData,
  ResourceKind,
  ResourcePost,
} from '@openpeepshq/common';
import { RESOURCE_KINDS, normalizeResourceTags } from '@openpeepshq/common/lib';
import { applyAudienceSetting, useCurrentProfile } from '@openpeepshq/react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  AudioPickerSheet,
  DocumentPickerSheet,
  ImagePickerSheet,
  VideoPickerSheet,
  type DocumentPickerSheetHandle,
} from '~/components/custom';
import { Input } from '~/components/ui/input';
import { ThemedText } from '~/components/ui/themed-text';
import { ComposeAttachments } from './ComposeAttachments';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import { VisibilitySelector } from './VisibilitySelector';

export interface ResourceFormProps {
  postData: PostCreationData;
  onChange: (data: PostCreationData) => void;
  isEdit?: boolean;
}

export const ResourceForm = ({
  postData,
  onChange,
  isEdit = false,
}: ResourceFormProps) => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const resource = postData.data as ResourcePost;
  const [tagDraft, setTagDraft] = useState('');
  const imageRef = useRef<BottomSheetModal>(null);
  const videoRef = useRef<BottomSheetModal>(null);
  const audioRef = useRef<BottomSheetModal>(null);
  const documentRef = useRef<DocumentPickerSheetHandle>(null);

  const patchResource = (patch: Partial<ResourcePost>) =>
    onChange({ ...postData, data: { ...resource, ...patch } });

  const setAudience = (settings: AudienceSetting) =>
    onChange(applyAudienceSetting(postData, settings, me));

  const addAttachments = (attachments: MediaAttachment[]) => {
    patchResource({
      attachments: [...(resource.attachments ?? []), ...attachments],
    });
  };

  const addTag = () => {
    patchResource({
      tags: normalizeResourceTags([
        ...(resource.tags ?? []),
        ...tagDraft.split(/[,\s]+/),
      ]),
    });
    setTagDraft('');
  };

  const openMedia = () => {
    if (resource.resourceKind === 'gallery') imageRef.current?.present();
    else if (resource.resourceKind === 'video') videoRef.current?.present();
    else if (resource.resourceKind === 'audio') audioRef.current?.present();
    else if (resource.resourceKind === 'file') void documentRef.current?.open();
  };

  return (
    <View>
      <View className="mt-4 gap-y-4 px-3">
        <ThemedText className="text-sm font-medium">
          {t('resources.form.name')}
        </ThemedText>
        <Input
          value={resource.title}
          onChangeText={(title) => patchResource({ title })}
        />

        <ThemedText className="text-sm font-medium">
          {t('resources.form.kind')}
        </ThemedText>
        <View className="flex-row flex-wrap gap-2">
          {RESOURCE_KINDS.map((kind) => (
            <Pressable
              key={kind}
              onPress={() =>
                patchResource({ resourceKind: kind as ResourceKind })
              }
              className={`rounded-full px-3 py-1 ${
                resource.resourceKind === kind ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <ThemedText
                className={
                  resource.resourceKind === kind
                    ? 'text-xs text-primary-foreground'
                    : 'text-xs text-muted-foreground'
                }
              >
                {t(`resources.kinds.${kind}`)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {resource.resourceKind === 'link' ? (
          <>
            <ThemedText className="text-sm font-medium">
              {t('resources.form.url')}
            </ThemedText>
            <Input
              value={resource.url ?? ''}
              onChangeText={(url) => patchResource({ url })}
              autoCapitalize="none"
            />
          </>
        ) : (
          <>
            <Pressable
              onPress={openMedia}
              className="items-center rounded-md border border-input px-3 py-2"
            >
              <ThemedText>{t('resources.form.addMedia')}</ThemedText>
            </Pressable>
            <ComposeAttachments
              attachments={resource.attachments ?? []}
              removeAttachment={(index) =>
                patchResource({
                  attachments: (resource.attachments ?? []).filter(
                    (_, i) => i !== index
                  ),
                })
              }
              updateAttachment={(index, attachment) =>
                patchResource({
                  attachments: (resource.attachments ?? []).map((item, i) =>
                    i === index ? attachment : item
                  ),
                })
              }
            />
          </>
        )}

        <OpenpeepsMarkdownInput
          rows={8}
          maxLength={4000}
          value={resource.content ?? ''}
          onChange={(content) => patchResource({ content })}
          placeholder={t('resources.form.descriptionPlaceholder')}
        />

        <ThemedText className="text-sm font-medium">
          {t('resources.form.tags')}
        </ThemedText>
        <Input
          value={tagDraft}
          onChangeText={setTagDraft}
          onSubmitEditing={addTag}
          placeholder={t('resources.form.tagsPlaceholder')}
        />
        <View className="flex-row flex-wrap gap-1">
          {normalizeResourceTags(resource.tags).map((tag) => (
            <Pressable
              key={tag}
              onPress={() =>
                patchResource({
                  tags: (resource.tags ?? []).filter(
                    (value) => value.toLowerCase() !== tag
                  ),
                })
              }
            >
              <ThemedText className="rounded-full bg-muted px-2 py-0.5 text-xs">
                #{tag}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText className="text-sm font-medium">
          {t('resources.form.hierarchy')}
        </ThemedText>
        <Input
          value={(resource.categoryPath ?? []).join(' / ')}
          onChangeText={(value) =>
            patchResource({
              categoryPath: value
                .split('/')
                .map((segment) => segment.trim())
                .filter(Boolean),
            })
          }
          placeholder={t('resources.form.addLevel')}
        />

        <ThemedText className="text-sm font-medium">
          {t('resources.form.visibility')}
        </ThemedText>
        <VisibilitySelector
          audienceSetting={postData}
          onChange={setAudience}
          disabled={isEdit}
          showDirect
        />
      </View>
      <ImagePickerSheet ref={imageRef} onSelect={addAttachments} />
      <VideoPickerSheet ref={videoRef} onSelect={addAttachments} />
      <AudioPickerSheet ref={audioRef} onSelect={addAttachments} />
      <DocumentPickerSheet ref={documentRef} onSelect={addAttachments} />
    </View>
  );
};
