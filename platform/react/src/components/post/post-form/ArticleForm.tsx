import { useMemo, useRef, useState } from 'react';
import { ChevronDown, Image as ImageIcon } from 'lucide-react';
import type { Article, PostCreationData } from '@openpeeps/common/types';
import { Button, Input, Label } from '@openpeeps/react-ui';
import { useT } from '../../../i18n';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { Avatar } from '../../profile';
import { ImageEditModal } from '../../form/ImageEditModal';
import { convertToWebpIfHeic } from '../../../lib/canvasUtils';
import { MentionTextarea } from './MentionTextarea';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { PostAudienceSelector } from './PostAudienceSelector';
import { audienceSummary } from './audienceChoices';
import { OpenpeepsMarkdown } from '../../markdown/OpenpeepsMarkdown';

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
    <div className="space-y-6">
      <div className="space-y-2">
        {article.image ? (
          <img
            src={article.image}
            alt=""
            className="max-h-96 w-full rounded-md object-cover"
          />
        ) : (
          <div className="bg-surface-100 flex h-48 w-full items-center justify-center rounded-md border">
            <ImageIcon className="text-muted-foreground size-10" />
          </div>
        )}
        <Button
          variant="variant-ringed-surface"
          action={() => imageInputRef.current?.click()}
        >
          {t('articles.form.uploadCover', {
            defaultValue: 'Upload cover image',
          })}
        </Button>
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

      {!isEdit && me ? (
        <button
          type="button"
          className="hover:bg-surface-100 flex w-full items-center gap-3 rounded-md border p-3 text-left"
          onClick={() => setAudienceOpen(true)}
        >
          <Avatar profile={me} size={3} borderless />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1 font-medium capitalize">
              {me.displayName ?? me.handle}
              <ChevronDown className="text-muted-foreground size-4" />
            </span>
            <span className="text-muted-foreground truncate text-sm">
              {audienceSummary(
                postData.visibility,
                t,
                selectedGroupName,
                postData.audience?.length,
              )}
            </span>
          </span>
        </button>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="article-title">
          {t('articles.form.title', { defaultValue: 'Title' })}
        </Label>
        <Input
          id="article-title"
          value={article.title ?? ''}
          onChange={(e) => patchArticle({ title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <MentionTextarea
          rows={16}
          value={article.content ?? ''}
          onChange={(content) => patchArticle({ content })}
          placeholder={t('articles.form.contentPlaceholder', {
            defaultValue: 'Write your article…',
          })}
        />
        <ComposePreviewLinks content={article.content} />
        {article.content ? (
          <div className="border-t pt-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
              {t('posts.form.preview', { defaultValue: 'Preview' })}
            </p>
            <OpenpeepsMarkdown source={article.content} linkPreviewMode="none" />
          </div>
        ) : null}
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
          onConfirm={(settings) => {
            const audience = settings.audience;
            const includesMe = audience?.some((p) => p.id === me?.id);
            onChange({
              ...postData,
              visibility: settings.visibility,
              groupId: settings.groupId ?? undefined,
              audience:
                settings.visibility === 'direct'
                  ? includesMe
                    ? audience ?? undefined
                    : [...(audience ?? []), ...(me ? [me] : [])]
                  : undefined,
            });
          }}
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
