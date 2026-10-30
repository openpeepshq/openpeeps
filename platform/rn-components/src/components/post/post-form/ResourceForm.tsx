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
import {
  RESOURCE_KINDS,
  RESOURCE_TITLE_MAX_LENGTH,
  normalizeResourceTags,
  resourceFormIssues,
} from '@openpeepshq/common/lib';
import { applyAudienceSetting, useCurrentProfile } from '@openpeepshq/react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  AudioPickerSheet,
  DocumentPickerSheet,
  ImagePickerSheet,
  VideoPickerSheet,
  type DocumentPickerSheetHandle,
} from '../../custom';
import { Input } from '../../ui/input';
import { ThemedText } from '../../ui/themed-text';
import { ComposeAttachments } from './ComposeAttachments';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import { VisibilitySelector } from './VisibilitySelector';

export interface ResourceFormProps {
  postData: PostCreationData;
  onChange: (data: PostCreationData) => void;
  isEdit?: boolean;
  /** Member can post this resource only to a group. */
  groupOnly?: boolean;
}

export const ResourceForm = ({
  postData,
  onChange,
  isEdit = false,
  groupOnly = false,
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

  const issues = resourceFormIssues({
    title: resource.title,
    resourceKind: resource.resourceKind,
    url: resource.url,
    attachments: resource.attachments,
    visibility: postData.visibility,
    audience: postData.audience,
    groupId: postData.groupId,
  });
  const titleMissing = issues.includes('title');
  const titleTooLong = issues.includes('titleLength');
  const urlIssue = issues.includes('url');
  const urlInvalid = urlIssue && Boolean(resource.url?.trim());
  const mediaMissing = issues.includes('media');
  const audienceMissing = issues.includes('audience');
  const groupMissing = issues.includes('group');
  const urlMessage = t('resources.validation.url', {
    defaultValue: 'Enter a real link, like https://example.com',
  });

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
          {t('resources.form.nameRequired', {
            defaultValue: 'Title (Required)',
          })}
        </ThemedText>
        <Input
          value={resource.title}
          maxLength={RESOURCE_TITLE_MAX_LENGTH}
          onChangeText={(title) => patchResource({ title })}
          accessibilityHint={
            titleMissing
              ? t('resources.validation.titleRequired', {
                  defaultValue: 'Title is required',
                })
              : titleTooLong
                ? t('resources.validation.titleTooLong', {
                    defaultValue: 'Title must be 200 characters or fewer',
                  })
                : undefined
          }
        />
        {titleMissing ? (
          <ThemedText className="text-sm text-muted-foreground">
            {t('resources.validation.titleRequired', {
              defaultValue: 'Title is required',
            })}
          </ThemedText>
        ) : null}
        {titleTooLong ? (
          <ThemedText className="text-sm text-destructive">
            {t('resources.validation.titleTooLong', {
              defaultValue: 'Title must be 200 characters or fewer',
            })}
          </ThemedText>
        ) : null}
        <ThemedText
          className={
            titleTooLong
              ? 'px-2 text-right text-sm text-destructive'
              : 'px-2 text-right text-sm'
          }
        >
          {resource.title.length} / {RESOURCE_TITLE_MAX_LENGTH}
        </ThemedText>

        <ThemedText className="text-sm font-medium">
          {t('resources.form.kind', {
            defaultValue: 'Type',
          })}
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
                {t(`resources.kinds.${kind}`, { defaultValue: kind })}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {resource.resourceKind === 'link' ? (
          <>
            <ThemedText className="text-sm font-medium">
              {t('resources.form.urlRequired', {
                defaultValue: 'URL (Required)',
              })}
            </ThemedText>
            <Input
              value={resource.url ?? ''}
              onChangeText={(url) => patchResource({ url })}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder={t('resources.form.urlPlaceholder', {
                defaultValue: 'https://example.com',
              })}
              className={urlInvalid ? 'border-destructive' : undefined}
              accessibilityHint={urlIssue ? urlMessage : undefined}
            />
            {urlIssue ? (
              <ThemedText
                className={
                  urlInvalid
                    ? 'text-sm text-destructive'
                    : 'text-sm text-muted-foreground'
                }
              >
                {urlMessage}
              </ThemedText>
            ) : null}
          </>
        ) : (
          <>
            <Pressable
              onPress={openMedia}
              className="items-center rounded-md border border-input px-3 py-2"
            >
              <ThemedText>
                {t('resources.form.addMedia', { defaultValue: 'Add files' })}
              </ThemedText>
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
            {mediaMissing ? (
              <ThemedText className="text-sm text-muted-foreground">
                {t('resources.validation.mediaRequired', {
                  defaultValue: 'Add the media or link this resource needs',
                })}
              </ThemedText>
            ) : null}
          </>
        )}

        <OpenpeepsMarkdownInput
          rows={8}
          maxLength={4000}
          value={resource.content ?? ''}
          onChange={(content) => patchResource({ content })}
          placeholder={t('resources.form.descriptionPlaceholder', {
            defaultValue: 'Describe this resource',
          })}
        />

        <ThemedText className="text-sm font-medium">
          {t('resources.form.tags', {
            defaultValue: 'Tags',
          })}
        </ThemedText>
        <Input
          value={tagDraft}
          onChangeText={setTagDraft}
          onSubmitEditing={addTag}
          placeholder={t('resources.form.tagsPlaceholder', {
            defaultValue: 'Add tags, then press Enter',
          })}
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
          {t('resources.form.hierarchy', {
            defaultValue: 'Place in the library',
          })}
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
          placeholder={t('resources.form.addLevel', {
            defaultValue: 'Add a folder',
          })}
        />

        <ThemedText className="text-sm font-medium">
          {t('resources.form.visibility', {
            defaultValue: 'Who can see this (Required)',
          })}
        </ThemedText>
        <VisibilitySelector
          audienceSetting={postData}
          onChange={setAudience}
          disabled={isEdit}
          showDirect
        />
        {!isEdit && groupOnly ? (
          <ThemedText className="text-sm text-muted-foreground">
            {t('resources.form.groupOnly', {
              defaultValue: 'You can only share resources with a group.',
            })}
          </ThemedText>
        ) : null}
        {groupMissing ? (
          <ThemedText className="text-sm text-muted-foreground">
            {t('resources.validation.groupRequired', {
              defaultValue: 'Choose a group before creating this resource.',
            })}
          </ThemedText>
        ) : null}
        {audienceMissing ? (
          <ThemedText className="text-sm text-muted-foreground">
            {t('resources.validation.directAudience', {
              defaultValue:
                'Choose at least one recipient for a direct resource.',
            })}
          </ThemedText>
        ) : null}
      </View>
      <ImagePickerSheet ref={imageRef} onSelect={addAttachments} />
      {/* Only galleries take more than one file; other kinds pick one. */}
      <VideoPickerSheet
        ref={videoRef}
        multiple={false}
        onSelect={addAttachments}
      />
      <AudioPickerSheet
        ref={audioRef}
        multiple={false}
        onSelect={addAttachments}
      />
      <DocumentPickerSheet
        ref={documentRef}
        multiple={false}
        onSelect={addAttachments}
      />
    </View>
  );
};
