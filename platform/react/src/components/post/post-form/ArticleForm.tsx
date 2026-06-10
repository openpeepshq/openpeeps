import { useMemo, useRef, useState } from 'react';
import { Eye, Image as ImageIcon } from 'lucide-react';
import type {
  Article,
  AudienceSetting,
  PostCreationData,
} from '@openpeeps/common/types';
import { Button, Input, Label } from '@openpeeps/react-ui';
import { useT } from '../../../i18n';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { ImageEditModal } from '../../form/ImageEditModal';
import { convertToWebpIfHeic } from '../../../lib/canvasUtils';
import { MentionTextarea } from './MentionTextarea';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { PostAudienceSelector } from './PostAudienceSelector';
import { audienceSummary } from './audienceChoices';

export interface ArticleFormProps {
  postData: PostCreationData;
  onChange: (data: PostCreationData) => void;
  isEdit?: boolean;
}

export function ArticleForm({
  postData,
  onChange,
  isEdit = false,
}: ArticleFormProps) {
  const t = useT();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const { upload } = openpeepsApi.useMediaUpload();

  const article = postData.data as Article;
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selectedGroupName = useMemo(
    () =>
      me?.memberships?.find((m) => m.group.id === postData.groupId)?.group
        .displayName,
    [me?.memberships, postData.groupId],
  );

  const patchArticle = (patch: Partial<Article>) => {
    onChange({
      ...postData,
      data: { ...article, ...patch },
    });
  };

  const setAudience = (settings: AudienceSetting) => {
    const audience = settings.audience ?? undefined;
    const includesMe = audience?.some((p) => p.id === me?.id);
    onChange({
      ...postData,
      visibility: settings.visibility,
      groupId: settings.groupId ?? undefined,
      audience:
        settings.visibility === 'direct'
          ? includesMe
            ? audience
            : [...(audience ?? []), ...(me ? [me] : [])]
          : undefined,
    });
  };

  const handleImageSelected = async (file: File) => {
    const processed = await convertToWebpIfHeic(file);
    if (processed.type.startsWith('image/')) {
      setPendingImage({
        file: processed,
        previewUrl: URL.createObjectURL(processed),
      });
      return;
    }
    const attachment = await upload({
      file: processed,
      usage: 'article-header-image',
    });
    patchArticle({ image: attachment.url ?? undefined });
  };

  return (
    <div>
      <div>
        {article.image ? (
          <img
            src={article.image}
            alt=""
            className="h-96 w-full object-cover"
          />
        ) : (
          <button
            type="button"
            className="bg-surface-100 hover:bg-surface-200 flex h-96 w-full items-center justify-center"
            onClick={() => imageInputRef.current?.click()}
          >
            <ImageIcon className="text-muted-foreground size-10" />
          </button>
        )}
        <div className="px-3 pt-2">
          <Button
            variant="variant-ringed-surface"
            action={() => imageInputRef.current?.click()}
          >
            {t('articles.form.uploadCover', {
              defaultValue: 'Upload your cover image',
            })}
          </Button>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageSelected(file);
            e.target.value = '';
          }}
        />
      </div>

      <div className="mt-4 flex flex-col gap-4 px-3">
        <h2 className="text-lg">
          {t('articles.form.title', { defaultValue: 'New Article' })}
        </h2>

        <Label
          title={t('articles.form.title', { defaultValue: 'New Article' })}
          htmlFor="article-title"
        >
          <Input
            id="article-title"
            value={article.title ?? ''}
            onChange={(e) => patchArticle({ title: e.target.value })}
          />
        </Label>

        <MentionTextarea
          rows={16}
          value={article.content ?? ''}
          onChange={(content) => patchArticle({ content })}
          placeholder={t('articles.form.contentPlaceholder', {
            defaultValue:
              'Write your content here.  User markdown for formatting',
          })}
        />
        <ComposePreviewLinks content={article.content} />

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Eye className="size-4" />
            <span>
              {t('articles.form.visibility', {
                defaultValue: 'Who can see this (Required)',
              })}
            </span>
          </div>
          <p className="text-surface-500 text-sm">
            {t('articles.form.visibilityNotChangeable', {
              defaultValue:
                "Once you post your article, you can't change the visibility",
            })}
          </p>
          <button
            type="button"
            className="flex h-10 w-full items-center text-sm font-light"
            onClick={() => !isEdit && setAudienceOpen(true)}
            disabled={isEdit}
          >
            {audienceSummary(
              postData.visibility,
              t,
              selectedGroupName,
              postData.audience?.length,
            )}
          </button>
        </div>
      </div>

      {!isEdit ? (
        <PostAudienceSelector
          open={audienceOpen}
          onClose={() => setAudienceOpen(false)}
          type="article"
          visibility={postData.visibility}
          groupId={postData.groupId ?? undefined}
          audience={postData.audience ?? []}
          showDirect
          onConfirm={setAudience}
        />
      ) : null}

      {pendingImage ? (
        <ImageEditModal
          file={pendingImage.file}
          previewUrl={pendingImage.previewUrl}
          open
          onClose={() => {
            URL.revokeObjectURL(pendingImage.previewUrl);
            setPendingImage(null);
          }}
          onConfirm={async (file) => {
            URL.revokeObjectURL(pendingImage.previewUrl);
            setPendingImage(null);
            const attachment = await upload({
              file,
              usage: 'article-header-image',
            });
            patchArticle({ image: attachment.url ?? undefined });
          }}
        />
      ) : null}
    </div>
  );
}
