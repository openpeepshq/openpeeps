import { useMemo, useState, type KeyboardEvent } from 'react';
import type {
  AudienceSetting,
  PostCreationData,
  ResourceKind,
  ResourcePost,
} from '@openpeepshq/common/types';
import { RESOURCE_KINDS, normalizeResourceTags } from '@openpeepshq/common/lib';
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
}

export const ResourceForm = ({
  postData,
  onChange,
  isEdit = false,
}: ResourceFormProps) => {
  const t = useT();
  const me = useCurrentProfile();
  const resource = postData.data as ResourcePost;
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const library = useResourceLibrary(postData.groupId ?? undefined);
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
          title={t('resources.form.name', { defaultValue: 'Title' })}
          htmlFor="resource-title"
        >
          <Input
            id="resource-title"
            data-testid="resources-title"
            value={resource.title}
            onChange={(event) => patchResource({ title: event.target.value })}
          />
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
            title={t('resources.form.url', { defaultValue: 'URL' })}
            htmlFor="resource-url"
          >
            <Input
              id="resource-url"
              data-testid="resources-url"
              value={resource.url ?? ''}
              onChange={(event) => patchResource({ url: event.target.value })}
            />
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
