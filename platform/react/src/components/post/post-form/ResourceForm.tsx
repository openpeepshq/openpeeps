import { useMemo, useState, type KeyboardEvent } from 'react';
import type {
  AudienceSetting,
  PostCreationData,
  ResourceKind,
  ResourcePost,
} from '@openpeepshq/common/types';
import {
  RESOURCE_KINDS,
  RESOURCE_TITLE_MAX_LENGTH,
  normalizeResourceTags,
  resourceFormIssues,
} from '@openpeepshq/common/lib';
import { Button, Input, Label } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { applyAudienceSetting } from '../../../lib/audienceSetting';
import { CategoryPathPicker } from '../../resources/CategoryPathPicker';
import { useResourceLibrary } from '../../../hooks';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import { PostAudienceSelector } from './PostAudienceSelector';
import { VisibilitySelector } from './VisibilitySelector';
import { useComposeAttachments } from './ComposeAttachments';

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
  const t = useT();
  const me = useCurrentProfile();
  const resource = postData.data as ResourcePost;
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const library = useResourceLibrary(
    postData.groupId ?? undefined,
    !postData.groupId,
  );
  const attachments = useComposeAttachments({
    attachments: resource.attachments ?? [],
    onChange: (next) => patchResource({ attachments: next }),
  });

  const patchResource = (patch: Partial<ResourcePost>) => {
    onChange({
      ...postData,
      data: { ...resource, ...patch },
    });
  };

  const setAudience = (settings: AudienceSetting) =>
    onChange(applyAudienceSetting(postData, settings, me));

  const addTag = () => {
    const next = normalizeResourceTags([
      ...(resource.tags ?? []),
      ...tagDraft.split(/[,\s]+/),
    ]);
    patchResource({ tags: next });
    setTagDraft('');
  };

  const onTagKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag();
    }
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

  const kindActions = useMemo(
    () => ({
      gallery: attachments.openImagePicker,
      video: attachments.openImagePicker,
      audio: attachments.openAudioPicker,
      file: attachments.openDocumentPicker,
      link: undefined,
    }),
    [attachments],
  );

  return (
    <div>
      <div className="mt-4 flex flex-col gap-4 px-3">
        <h2 className="text-lg">
          {t('resources.form.title', { defaultValue: 'New resource' })}
        </h2>

        <Label
          title={t('resources.form.nameRequired', {
            defaultValue: 'Title (Required)',
          })}
          htmlFor="resource-title"
        >
          <Input
            id="resource-title"
            data-testid="resources-title"
            value={resource.title}
            maxLength={RESOURCE_TITLE_MAX_LENGTH}
            aria-invalid={titleMissing || titleTooLong}
            aria-describedby={
              titleMissing
                ? 'resource-title-error resource-title-count'
                : 'resource-title-count'
            }
            onChange={(event) => patchResource({ title: event.target.value })}
          />
          {titleMissing ? (
            <span
              id="resource-title-error"
              role="status"
              className="text-muted-foreground mt-1 text-sm"
            >
              {t('resources.validation.titleRequired', {
                defaultValue: 'Title is required',
              })}
            </span>
          ) : null}
          {titleTooLong ? (
            <span role="alert" className="text-destructive mt-1 text-sm">
              {t('resources.validation.titleTooLong', {
                defaultValue: 'Title must be 200 characters or fewer',
              })}
            </span>
          ) : null}
          <span
            id="resource-title-count"
            className="block w-full px-2 text-right text-sm"
          >
            <span className={titleTooLong ? 'text-error' : undefined}>
              {resource.title.length}
            </span>{' '}
            / {RESOURCE_TITLE_MAX_LENGTH}
          </span>
        </Label>

        <div>
          <p className="mb-2 text-sm font-medium">
            {t('resources.form.kind', { defaultValue: 'Type' })}
          </p>
          <div className="flex flex-wrap gap-2">
            {RESOURCE_KINDS.map((kind) => (
              <Button
                key={kind}
                variant={resource.resourceKind === kind ? 'default' : 'outline'}
                compact
                data-testid={`resources-kind-${kind}`}
                action={() =>
                  patchResource({ resourceKind: kind as ResourceKind })
                }
              >
                {t(`resources.kinds.${kind}`, { defaultValue: kind })}
              </Button>
            ))}
          </div>
        </div>

        {resource.resourceKind === 'link' ? (
          <Label
            title={t('resources.form.urlRequired', {
              defaultValue: 'URL (Required)',
            })}
            htmlFor="resource-url"
          >
            <Input
              id="resource-url"
              data-testid="resources-url"
              value={resource.url ?? ''}
              placeholder={t('resources.form.urlPlaceholder', {
                defaultValue: 'https://example.com',
              })}
              inputMode="url"
              spellCheck={false}
              error={urlInvalid}
              aria-invalid={urlIssue}
              aria-describedby={urlIssue ? 'resource-url-error' : undefined}
              onChange={(event) => patchResource({ url: event.target.value })}
            />
            {urlIssue ? (
              <span
                id="resource-url-error"
                role={urlInvalid ? 'alert' : 'status'}
                data-testid="resources-url-error"
                className={
                  urlInvalid
                    ? 'text-destructive mt-1 text-sm'
                    : 'text-muted-foreground mt-1 text-sm'
                }
              >
                {urlMessage}
              </span>
            ) : null}
          </Label>
        ) : (
          <div className="space-y-2">
            <Button
              variant="outline"
              action={kindActions[resource.resourceKind]}
            >
              {t('resources.form.addMedia', {
                defaultValue: 'Add files',
              })}
            </Button>
            {attachments.previews}
            {attachments.inputs}
            {mediaMissing ? (
              <p role="status" className="text-muted-foreground text-sm">
                {t('resources.validation.mediaRequired', {
                  defaultValue: 'Add the media or link this resource needs',
                })}
              </p>
            ) : null}
          </div>
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

        <Label
          title={t('resources.form.tags', { defaultValue: 'Tags' })}
          htmlFor="resource-tags"
        >
          <Input
            id="resource-tags"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={onTagKey}
            onBlur={addTag}
            placeholder={t('resources.form.tagsPlaceholder', {
              defaultValue: 'Add tags, then press Enter',
            })}
          />
        </Label>
        {resource.tags?.length ? (
          <div className="flex flex-wrap gap-1">
            {normalizeResourceTags(resource.tags).map((tag) => (
              <button
                key={tag}
                type="button"
                className="bg-muted rounded-full px-2 py-0.5 text-xs"
                onClick={() =>
                  patchResource({
                    tags: (resource.tags ?? []).filter(
                      (value) => value.toLowerCase() !== tag,
                    ),
                  })
                }
              >
                #{tag}
              </button>
            ))}
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium">
            {t('resources.form.hierarchy', {
              defaultValue: 'Place in the library',
            })}
          </p>
          <CategoryPathPicker
            path={resource.categoryPath ?? []}
            tree={library.tree}
            onChange={(categoryPath) => patchResource({ categoryPath })}
          />
        </div>

        <Label
          title={t('resources.form.visibility', {
            defaultValue: 'Who can see this (Required)',
          })}
          description={t('resources.form.visibilityNotChangeable', {
            defaultValue:
              "Once you post your resource, you can't change the visibility",
          })}
        >
          <VisibilitySelector
            postData={postData}
            onClick={() => setAudienceOpen(true)}
            disabled={isEdit}
            showDirect
          />
          {!isEdit && groupOnly ? (
            <span role="status" className="text-muted-foreground mt-1 text-sm">
              {t('resources.form.groupOnly', {
                defaultValue: 'You can only share resources with a group.',
              })}
            </span>
          ) : null}
          {groupMissing ? (
            <span
              id="resource-group-error"
              role="status"
              className="text-muted-foreground mt-1 text-sm"
            >
              {t('resources.validation.groupRequired', {
                defaultValue: 'Choose a group before creating this resource.',
              })}
            </span>
          ) : null}
          {audienceMissing ? (
            <span
              id="resource-audience-error"
              role="status"
              className="text-muted-foreground mt-1 text-sm"
            >
              {t('resources.validation.directAudience', {
                defaultValue:
                  'Choose at least one recipient for a direct resource.',
              })}
            </span>
          ) : null}
        </Label>
      </div>

      {!isEdit ? (
        <PostAudienceSelector
          open={audienceOpen}
          onClose={() => setAudienceOpen(false)}
          type="resource"
          visibility={postData.visibility}
          groupId={postData.groupId ?? undefined}
          audience={postData.audience ?? []}
          showDirect
          onConfirm={setAudience}
        />
      ) : null}
    </div>
  );
};
